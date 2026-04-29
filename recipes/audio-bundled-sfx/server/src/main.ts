// ============================================================================
// Recipe: Audio Bundled SFX — Server entry point
// ============================================================================
//
// This recipe is a client-side lesson. The server exists only because Root
// apps must declare a server in their manifest — the runtime won't deploy
// an app whose manifest has no server. We satisfy that requirement with a
// `lifecycle.start(() => {})` no-op.
//
// If you fork this recipe and add server behavior (e.g. composing with
// `chat-trigger-respond` to play a sound on chat events), put your wiring
// inside `onStarting`.
// ============================================================================

import { rootServer, RootAppStartState } from "@rootsdk/server-app";

async function onStarting(_state: RootAppStartState): Promise<void> {
  // Intentionally empty — the audio mechanic lives entirely in the client.
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
