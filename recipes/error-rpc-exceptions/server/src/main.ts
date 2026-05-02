// ============================================================================
// Recipe: RPC Exceptions — Entry Point
// Composes: networking-app-services + server-key-value-store
// ============================================================================
//
// Register ClaimService, then wire the test harness's slash-command driver.
// The lesson is in claim-service.ts (typed-error throws) and the client
// App.tsx (three shapes of catch-and-branch); this file is boilerplate by
// design. The `initializeTestDriver` call is test-only — forks of this
// recipe should drop it and delete test-driver.ts (see test-driver.ts
// header).
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { claimService } from "./claim-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  rootServer.lifecycle.addService(claimService);

  // Test infrastructure — wires the harness's slash command. Forks of this
  // recipe should remove this line and delete test-driver.ts.
  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
