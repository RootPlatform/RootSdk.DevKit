// ============================================================================
// Recipe: Batch-Prefetch Related Data — Entry Point
// Composes: server-database + networking-app-services
// ============================================================================
//
// Startup order:
//   1. openDatabase + runSchemaMigrations — DB ready before anything reads
//      it. Migration also seeds the activities + owners tables on first
//      run.
//   2. addService — registers ActivityService.
//   3. initializeTestDriver — wires the test harness's slash command.
//      Forks of this recipe should remove this line and delete
//      test-driver.ts.
//
// No globalSettings hook (no admin gate; the recipe is read-only).
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { openDatabase, runSchemaMigrations } from "./db";
import { activityService } from "./activity-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);

  rootServer.lifecycle.addService(activityService);

  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
