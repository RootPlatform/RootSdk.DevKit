// ============================================================================
// Recipe: Chat Trigger + Respond — Entry Point
// Composes: server-channel-messages
// ============================================================================
//
// Smallest recipe shape we ship: server-only, no proto, no SQLite, no
// settings, no client, no test driver. The recipe is exactly the
// chat-trigger lesson — nothing else.
//
// Tests verify the recipe by posting a real `/ping <text>` chat message
// from the harness's platform connection (a different user identity than
// the bot) and asserting the bot's `pong: <text>` reply appears in the
// channel. No synthesized events; the actual subscription pipeline runs.
//
// ============================================================================

import { rootServer } from "@rootsdk/server-app";
import { initializePingHandler } from "./ping-handler";

async function onStarting(): Promise<void> {
  initializePingHandler();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
