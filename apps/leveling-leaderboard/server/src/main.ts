import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations } from "./db";
import { initializeAdminCheck, onAdminsChanged } from "./adminCheck";
import { initializeXpEligibleGroup } from "./xpEligibleGroup";
import { initializeExcludedCache } from "./excludedChannelsStore";
import { initializeChannelNameCache } from "./channelNameCache";
import { initializeMessageHandler } from "./messageHandler";
import { initializeLeaderboardBroadcaster } from "./leaderboardBroadcaster";
import { leaderboardService } from "./leaderboardService";
import { log, errFields } from "./lib/log";

// ============================================================================
// Startup order matters:
//   1. openDatabase + runSchemaMigrations — DB ready before anything reads it.
//   2. initializeAdminCheck — caches community owner and binds to the
//      globalSettings.general.admins ReadOnlyMemberGroup.
//   3. initializeXpEligibleGroup — creates or loads our xpEligible MemberGroup.
//      Runs before messageHandler so the eligibility check is live from the
//      first message.
//   4. initializeExcludedCache — hydrates in-memory channel-exclusion Set.
//   5. initializeChannelNameCache — populates channelId → name and subscribes
//      to ChannelEvent for live updates; must run before messageHandler so
//      broadcasts carry correct names from the first message.
//   6. initializeMessageHandler — subscribes to ChannelMessageCreated.
//   7. initializeLeaderboardBroadcaster — starts the 500ms coalesce tick.
//   8. onAdminsChanged wiring — admins live in globalSettings, so changes to
//      them arrive via globalSettings "update" events. This hook fires the
//      public AdminsChanged broadcast so clients re-check amIAdmin. The
//      broadcast carries no payload — it's a signal only. (SettingsUpdated
//      is admin-only and wouldn't reach a demoted admin anyway.)
//   9. addService — registers the RPC surface. Must be called in onStarting.
// ============================================================================

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);
  log("info", "database opened, schema migrated");

  await initializeAdminCheck(state);
  await initializeXpEligibleGroup();
  await initializeExcludedCache(db);
  await initializeChannelNameCache();
  initializeMessageHandler();
  initializeLeaderboardBroadcaster();

  onAdminsChanged(() => {
    void leaderboardService.notifyAdminsChanged().catch((err) =>
      log("error", "admins-changed broadcast failed", errFields(err)),
    );
  });

  rootServer.lifecycle.addService(leaderboardService);
  log("info", "leaderboard service registered; startup complete");
}

(async () => {
  try {
    await rootServer.lifecycle.start(onStarting);
  } catch (err) {
    log("error", "lifecycle.start failed — app did not start", errFields(err));
    throw err;
  }
})();
