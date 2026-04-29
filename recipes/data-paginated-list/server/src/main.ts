// ============================================================================
// Recipe: Cursor-Based Pagination — Entry Point
// Composes: server-app-data-store + networking-app-services
// ============================================================================
//
// Startup order matters:
//   1. openDatabase + runSchemaMigrations — DB ready before anything reads it.
//      Migration also seeds 100 placeholder rows the first time it runs.
//   2. addService — registers the RPC surface. Must happen inside onStarting,
//      before start() resolves.
//   3. initializeTestDriver — wires the slash-command driver used by the
//      test harness in Code/Ops.Testing/test-devkit/test-recipes. Forks of
//      this recipe should remove this line and delete test-driver.ts.
//
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations } from "./db";
import { listService } from "./list-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);

  rootServer.lifecycle.addService(listService);

  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
