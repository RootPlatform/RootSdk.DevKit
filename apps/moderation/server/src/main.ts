import {
  rootServer,
  RootAppStartState,
  JobInterval,
  JobScheduleEvent,
} from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations, getDb } from "./db";
import { initializeAdminCheck, onAdminsChanged } from "./adminCheck";
import {
  initializeAdminAudience,
  syncAdminAudience,
} from "./adminAudience";
import {
  initializeExemptWatcher,
  onExemptChanged,
} from "./exemptMembers";
import { initializeChannelNameCache } from "./channelNameCache";
import { initializeMemberCache } from "./memberCache";
import { initializeWarningCooldown } from "./warningCooldown";
import { initializeUsernameFilter } from "./usernameFilter";
import { initializeMonitoredCache } from "./monitoredChannelsStore";
import { initializeMessageHandler } from "./messageHandler";
import { setAuditBroadcaster } from "./auditDispatch";
import { moderationService } from "./moderationService";
import { getGeneral, getRateLimit, getSpamControl } from "./settingsStore";
import { pruneOlderThan } from "./auditLogStore";
import { prune as pruneSpam } from "./spamDetector";
import { prune as pruneRate } from "./rateLimiter";
import { log, errFields } from "./lib/log";

// Startup order:
//   1. openDatabase + runSchemaMigrations — DB ready before stores read.
//   2. initializeAdminCheck — caches owner + binds globalSettings admins.
//   3. initializeAdminAudience — composes owner ∪ admins into the broadcast
//      audience MemberGroup. Must run after adminCheck; uses its cached
//      owner + admins selection.
//   4. initializeChannelNameCache — populates channel/group name maps.
//   5. initializeMonitoredCache — hydrates the monitored-channels Set.
//   6. setAuditBroadcaster + initializeMessageHandler — register the audit
//      dispatch funnel so messageHandler's rule paths and the service's
//      manual actions both broadcast through one place. Must precede
//      message-handler subscription so the first inbound message has a
//      live broadcaster.
//   7. onAdminsChanged hook — re-syncs adminAudience AND fires
//      AdminsChanged so clients refresh amIAdmin when the admins picker
//      moves or the owner changes.
//   8. initializeCleanupJob — daily retention prune + sliding-window
//      buffer prune.
//   9. addService — registers the RPC surface; must be in onStarting.

const CLEANUP_RESOURCE = "moderation-cleanup";
const CLEANUP_TAG = "daily-cleanup";

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);
  log("info", "database opened, schema migrated");

  // Initializers split into two shapes by intent (and signature):
  //   - `await initializeX(...)` for hydration steps that need an SDK
  //     round-trip before subsequent code can rely on their state
  //     (admin check needs the community owner, channel cache needs
  //     the channel list, etc.).
  //   - `initializeX(...)` (sync) for steps that ONLY register event
  //     listeners; nothing needs to await their completion because the
  //     listener subscription is itself synchronous.
  await initializeAdminCheck(state);
  await initializeAdminAudience();
  initializeExemptWatcher(state);
  await initializeChannelNameCache();
  initializeMemberCache();
  initializeWarningCooldown();
  await initializeMonitoredCache(db);

  setAuditBroadcaster(() => moderationService.notifyAuditLogAppended());
  initializeMessageHandler();
  initializeUsernameFilter();

  onAdminsChanged(() => {
    // Re-sync the broadcast audience when admins or ownership shift.
    void syncAdminAudience();
    void moderationService.notifyAdminsChanged();
  });

  // The exempt picker is a globalSettings value, so app-internal mutations
  // don't fire SettingsChanged on their own. Funnel exempt-selection
  // changes through SettingsChanged so the in-app General tab refreshes
  // its Pill list when an admin edits the picker in Root's native UI.
  onExemptChanged(() => {
    void moderationService.notifySettingsChanged();
  });

  await initializeCleanupJob();

  rootServer.lifecycle.addService(moderationService);
  log("info", "moderation service registered; startup complete");
}

// Daily retention cleanup. The job scheduler fires `Job` events at the
// configured time; we also catch up on `JobMissed` so a long downtime
// still gets a single prune pass when the app comes back online.
async function initializeCleanupJob(): Promise<void> {
  // Idempotent: replace any existing daily cleanup job so a manifest /
  // schedule change doesn't compound across deploys. Daily anchor is "now"
  // so the first run is ~24h after install.
  await rootServer.jobScheduler.deleteByTag(CLEANUP_TAG);
  await rootServer.jobScheduler.create({
    resourceId: CLEANUP_RESOURCE,
    tag: CLEANUP_TAG,
    start: new Date(),
    jobInterval: JobInterval.Daily,
  });

  rootServer.jobScheduler.on(JobScheduleEvent.Job, (evt) => {
    if (evt.tag !== CLEANUP_TAG) return;
    void runCleanup().catch((err) =>
      log("error", "cleanup job failed", errFields(err)),
    );
  });
  rootServer.jobScheduler.on(JobScheduleEvent.JobMissed, (evt) => {
    if (evt.tag !== CLEANUP_TAG) return;
    log("info", "cleanup missed; catching up", { jobTime: evt.jobTime });
    void runCleanup().catch((err) =>
      log("error", "cleanup catch-up failed", errFields(err)),
    );
  });
}

async function runCleanup(): Promise<void> {
  const db = getDb();
  const general = await getGeneral();
  const auditCutoff = Date.now() - general.retentionDays * 24 * 60 * 60 * 1000;
  const pruned = await pruneOlderThan(db, auditCutoff);
  log("info", "audit log pruned", { rows: pruned });

  // Spam buffer: keep two windows of headroom so pruning races never drop
  // a row that's still inside the active detection window.
  const spam = await getSpamControl();
  const spamWindowMs = spam.windowMinutes * 60_000;
  await pruneSpam(db, Date.now() - 2 * spamWindowMs);

  const rate = await getRateLimit();
  const rateWindowMs = rate.windowSeconds * 1000;
  await pruneRate(db, Date.now() - 2 * rateWindowMs);
}

(async () => {
  try {
    await rootServer.lifecycle.start(onStarting);
  } catch (err) {
    log("error", "lifecycle.start failed — app did not start", errFields(err));
    throw err;
  }
})();
