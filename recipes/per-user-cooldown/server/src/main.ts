// ============================================================================
// Recipe: Per-User Cooldown — Entry Point
// Composes: server-app-data-store + networking-app-services
// ============================================================================
//
// Startup order:
//   1. openDatabase + runSchemaMigrations — DB ready before anything reads it.
//   2. addService — registers the RPC surface inside onStarting.
//   3. initializeTestDriver — wires the slash-command driver used by the
//      test harness in Code/Ops.Testing/test-devkit/test-recipes. Forks of
//      this recipe should remove this line and delete test-driver.ts.
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations } from "./db";
import { cooldownService } from "./cooldown-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);

  rootServer.lifecycle.addService(cooldownService);

  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
