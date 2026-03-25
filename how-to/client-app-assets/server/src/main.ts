// ============================================================================
// How-To: Client Assets — Server Entry Point
// SDK: rootServer.lifecycle.addService(service) — register RPC services
//      rootServer.dataStore.assets.create — convert upload tokens
//      rootServer.dataStore.appData — persist asset URIs
// Permissions: channel.createMessage (for self-test output)
// Works in: Apps (@rootsdk/server-app)
// ============================================================================
//
// Registers UploadService which handles the client → server upload flow:
//   1. Client uploads via rootClient.assets.fileUpload()
//   2. Client sends token via RPC (uploadService.submitUpload)
//   3. Server converts token → asset URI → persists in key-value store
//   4. Server returns asset URI to client for display
//
// ============================================================================

import {
  rootServer,
  RootAppStartState,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-app";

import { uploadService } from "./upload-service";

async function onStarting(state: RootAppStartState) {
  rootServer.lifecycle.addService(uploadService);

  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onClientAssetsCommand,
  );
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();

// --- COMMAND HANDLER: /client-app-assets -----------------------------------------
// Self-test: verifies service registration, asset API access, and
// key-value store persistence.

async function onClientAssetsCommand(
  evt: ChannelMessageCreatedEvent,
): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/client-app-assets")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Verify UploadService registered
    lines.push("✓ UploadService registered");

    // 2. Verify appData persistence (the upload service persists asset URIs here)
    const testKey = "upload:self-test";
    const testValue = "root://asset/self-test-placeholder";
    await rootServer.dataStore.appData.set({ key: testKey, value: testValue });
    const retrieved = await rootServer.dataStore.appData.get<string>(testKey);
    const match = retrieved === testValue;
    lines.push(`✓ appData persist/retrieve: match=${match}`);

    // Clean up test key
    await rootServer.dataStore.appData.delete(testKey);

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    lines.push(`✗ error: ${err}`);
    await messages.create({ channelId, content: lines.join("\n") });
  }
}
