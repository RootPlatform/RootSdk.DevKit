// ============================================================================
// Recipe: App Settings (Flat Values) — Entry Point
// Composes: server-app-data-store + server-global-settings + networking-app-services
// ============================================================================
//
// Startup order:
//   1. addService — registers SettingsService. Must happen inside onStarting.
//   2. Subscribe to globalSettings "update" — when the admins picker
//      changes, fire SettingsChanged so connected clients re-fetch and
//      update their is_admin flag (a user just promoted/demoted should
//      see the form switch between editable and read-only without a
//      manual refresh).
//   3. initializeTestDriver — wires the test harness's slash command.
//      Forks of this recipe should remove this line and delete
//      test-driver.ts.
//
// ============================================================================

import {
  rootServer,
  RootAppStartState,
  GlobalSettingsEvent,
} from "@rootsdk/server-app";
import { settingsService } from "./settings-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  rootServer.lifecycle.addService(settingsService);

  // The admins picker moving doesn't change the stored values, but it does
  // change every caller's is_admin flag — so connected clients should
  // re-fetch GetSettings to update form editability.
  //
  // Scope: this fires on ANY update to the manifest's settings. Today the
  // recipe declares only `general.admins` so every update is the admins
  // picker. If you fork this recipe and add another setting under the
  // same group, this handler will broadcast on every save of any of
  // them — readers refetch unnecessarily.
  // TODO(SDK): per-key change filtering — narrow this handler to fire only when admins changed
  state.globalSettings?.on(GlobalSettingsEvent.Update, () => {
    settingsService.broadcastSettingsChanged({}, "all");
  });

  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
