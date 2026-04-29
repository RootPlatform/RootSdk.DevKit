// ============================================================================
// Recipe: External HTTP Fetch — Entry Point
// Composes: networking-app-services + (Node global fetch)
// ============================================================================
//
// Startup is minimal — register the service and the test driver. No DB,
// no globalSettings, no admin gate. The HTTP call itself happens lazily
// when a client invokes FetchUuid.
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { uuidFetchService } from "./uuid-fetch-service";
import { initializeTestDriver } from "./test-driver";

async function onStarting(state: RootAppStartState): Promise<void> {
  rootServer.lifecycle.addService(uuidFetchService);
  initializeTestDriver(state.communityId);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
