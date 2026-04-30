// ============================================================================
// Recipe: App Settings (List Values) — Entry Point
// Composes: server-app-data-store + server-global-settings + networking-app-services
// ============================================================================
//
// Startup order:
//   1. openDatabase + runSchemaMigrations — DB ready before anything reads
//      it. Migration creates the blocked_terms table; no seed (list starts
//      empty).
//   2. addService — registers BlockedTermsService.
//   3. Subscribe to globalSettings "update" — when the admins picker
//      changes, fire BlockedTermsChanged so connected clients re-fetch
//      and update their is_admin flag.
//   4. initializeTestDriver — wires the test harness's slash command.
//      Forks of this recipe should remove this line and delete
//      test-driver.ts.
//
// ============================================================================

import {
  rootServer,
  RootAppStartState,
  GlobalSettingsEvent,
} from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations } from "./db";
import { blockedTermsService } from "./blocked-terms-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);

  rootServer.lifecycle.addService(blockedTermsService);

  // Admins picker change → flip is_admin for affected callers. The list
  // doesn't change, but every connected client should re-fetch to update
  // their UI affordances.
  //
  // Scope: this fires on ANY update to the manifest's settings. Today the
  // recipe declares only `general.admins` so every update is the admins
  // picker. If you fork this recipe and add another setting under the
  // same group, this handler will broadcast on every save of any of
  // them — readers refetch unnecessarily. The event payload exposes
  // `previous` and `current` (full GlobalSettings snapshots) but not a
  // changed-key marker, so per-key narrowing means diffing the snapshots,
  // and ReadOnlyMemberGroup equality semantics aren't documented today.
  // TODO(SDK): per-key change filtering — narrow this handler to fire only when admins changed
  state.globalSettings?.on(GlobalSettingsEvent.Update, () => {
    blockedTermsService.broadcastBlockedTermsChanged({}, "all");
  });

  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
