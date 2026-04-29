// ============================================================================
// Recipe: App Settings (Per-Context) — Entry Point
// Composes: server-app-data-store + server-global-settings + networking-app-services
// ============================================================================
//
// Startup order:
//   1. openDatabase + runSchemaMigrations — DB ready before anything reads
//      it. Migration creates the channel_configs table; no seed (channels
//      start with no config rows).
//   2. addService — registers ChannelConfigsService.
//   3. Subscribe to globalSettings "update" — when the admins picker
//      changes, broadcast ChannelConfigsChanged so connected clients
//      re-fetch and update their is_admin flag. (See scope note below.)
//   4. initializeTestDriver — wires the test harness's slash command.
//      Forks of this recipe should remove this line and delete
//      test-driver.ts.
//
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations } from "./db";
import { channelConfigsService } from "./channel-configs-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);

  rootServer.lifecycle.addService(channelConfigsService);

  // Admins picker change → flip is_admin for affected callers. The configs
  // don't change, but every connected client should re-fetch to update
  // their UI affordances.
  //
  // Scope: this fires on ANY update to the manifest's settings. Today the
  // recipe declares only `general.admins` so every update is the admins
  // picker. If you fork this recipe and add another setting under the
  // same group, this handler will broadcast on every save of any of
  // them — readers refetch unnecessarily.
  // TODO(SDK): GlobalSettingsEvent enum unreleased — swap "update" → GlobalSettingsEvent.Update once it ships
  // TODO(SDK): per-key change filtering — narrow this handler to fire only when admins changed
  state.globalSettings?.on("update", () => {
    channelConfigsService.broadcastChannelConfigsChanged({}, "all");
  });

  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
