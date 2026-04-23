// ============================================================================
// API Sample: Client App Theme — Server Entry Point
// Works in: Apps (@rootsdk/server-app)
// ============================================================================
//
// Minimal server for the client-app-theme api sample. The client-side code
// (client/src/ThemeDemo.tsx) demonstrates the @rootsdk/client-app theme API.
//
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";

async function onStarting(state: RootAppStartState) {
  // No server-side logic needed — this api sample demonstrates client APIs.
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
