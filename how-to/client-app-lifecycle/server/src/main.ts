// ============================================================================
// How-To: Client App Lifecycle — Server Entry Point
// Works in: Apps (@rootsdk/server-app)
// ============================================================================
//
// Minimal server for the client-app-lifecycle how-to. The client-side code
// (client/src/RestartPanel.tsx) demonstrates the @rootsdk/client-app
// lifecycle API (rootClient.lifecycle.restart).
//
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";

async function onStarting(state: RootAppStartState) {
  // No server-side logic needed — this how-to demonstrates client APIs.
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
