import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations } from "./db";
import { initializeAdminCheck, onAdminsChanged } from "./adminCheck";
import {
  initializeAdminAudience,
  syncAdminAudience,
} from "./adminAudience";
import {
  initializePollJobs,
  reconcilePollJobs,
  scheduleReconcileJob,
} from "./pollJobs";
import { releaseWatcherService } from "./releaseWatcherService";
import { setReleaseBroadcaster } from "./releaseBroadcaster";
import { log, errFields } from "./lib/log";

// ============================================================================
// Startup order matters:
//   1. openDatabase + runSchemaMigrations — DB ready before anything reads
//      it. The PRAGMA foreign_keys = ON inside openDatabase enables the
//      ON DELETE CASCADE that RemoveRepo relies on.
//   2. initializeAdminCheck — caches community owner and binds to the
//      globalSettings.general.admins ReadOnlyMemberGroup. Must run before
//      the first RPC arrives so isAdmin can answer.
//   3. initializeAdminAudience — creates/loads the server-managed Member
//      Group used as the audience for admin-only broadcasts. Composes
//      admins-selection ∪ owner so an owner who isn't explicitly in the
//      admins setting still receives admin events. See adminAudience.ts.
//   4. setReleaseBroadcaster — registers the service's BroadcastReleaseAdded
//      with the broadcaster module. Done before pollJobs starts so any
//      JobMissed firing during reconciliation can broadcast its results.
//   5. initializePollJobs — registers the JobScheduleEvent.Job and
//      JobScheduleEvent.JobMissed handlers. Done before reconciliation so
//      any jobs that fire during reconciliation route through the handler.
//   6. reconcilePollJobs — walks watched_repos and scheduled jobs; creates
//      missing pollers, drops orphans. Self-healing safety net for
//      mid-state crashes and long outages where JobMissed wouldn't replay.
//      See DESIGN.md → Startup reconciliation.
//   7. scheduleReconcileJob — schedules a Daily safety-net reconcile that
//      catches the silent-stop failure mode where a transient SDK error
//      during chained-OneTime reschedule left a repo without a pending job.
//   8. onAdminsChanged wiring — admins live in globalSettings, so changes
//      to them arrive via globalSettings "update" events. Two callbacks:
//        a. fire the public AdminsChanged broadcast so clients re-check
//           am_i_admin
//        b. re-sync the adminAudience MemberGroup so subsequent admin
//           broadcasts target the updated owner+admins set
//   9. addService — registers the RPC surface. Must be called in
//      onStarting per the SDK contract.
// ============================================================================

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);
  log("info", "database opened, schema migrated");

  await initializeAdminCheck(state);
  await initializeAdminAudience();

  // Wire the service into releaseBroadcaster as the broadcast target. The
  // broadcaster doesn't import the service (avoids a circular import); it
  // calls the registered function when a new release lands. Must be set
  // before pollJobs initializes — a JobMissed firing during reconciliation
  // could call onNewRelease before addService() runs, and we want those
  // broadcasts to go out.
  setReleaseBroadcaster((release) =>
    releaseWatcherService.broadcastReleaseAdded({ release }, "all"),
  );

  initializePollJobs();
  await reconcilePollJobs();
  // Daily safety-net reconcile. Catches the silent-stop failure mode where
  // a transient SDK error during the chained-OneTime reschedule left a repo
  // without a pending job. See pollJobs.ts → scheduleReconcileJob.
  await scheduleReconcileJob();

  // Two onAdminsChanged subscribers — both routed through their own
  // safeBroadcast / try-catch internally. `void` discards the returned
  // Promise so the synchronous-callback contract of onAdminsChanged is
  // preserved.
  onAdminsChanged(() => {
    void releaseWatcherService.notifyAdminsChanged();
  });
  onAdminsChanged(() => {
    void syncAdminAudience();
  });

  rootServer.lifecycle.addService(releaseWatcherService);
  log("info", "release-watcher service registered; startup complete");
}

(async () => {
  try {
    await rootServer.lifecycle.start(onStarting);
  } catch (err) {
    log("error", "lifecycle.start failed — app did not start", errFields(err));
    throw err;
  }
})();
