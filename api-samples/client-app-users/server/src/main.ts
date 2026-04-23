// ============================================================================
// API Sample: Client Users — Server Entry Point
// Works in: Apps (@rootsdk/server-app)
// ============================================================================
//
// Minimal server for the client-app-users api sample. The client-side code
// (client/src/UserCard.tsx) demonstrates the @rootsdk/client-app user APIs.
// Server-side member APIs are covered in api-samples/server-members/.
//
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";

async function onStarting(state: RootAppStartState) {
  // No server-side logic needed — this api sample demonstrates client APIs.
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
