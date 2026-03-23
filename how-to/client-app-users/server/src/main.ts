// ============================================================================
// How-To: Client Users — Server Entry Point
// Works in: Apps (@rootsdk/server-app)
// ============================================================================
//
// Minimal server for the client-app-users how-to. The client-side code
// (client/src/UserCard.tsx) demonstrates the @rootsdk/client-app user APIs.
// Server-side member APIs are covered in how-to/server-members/.
//
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";

async function onStarting(state: RootAppStartState) {
  // No server-side logic needed — this how-to demonstrates client APIs.
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
