// ============================================================================
// How-To: Networking App Services — Entry Point
// SDK: rootServer.lifecycle.addService(service) — register RPC services
//      rootServer.lifecycle.start(onStarting) — app lifecycle
// Permissions: channel.createMessage (for the /networking-app-services self-test command)
// Events: ChannelMessageCreated (for command trigger)
// Works in: Apps only (@rootsdk/server-app)
// ============================================================================
//
// Services must be registered via addService() inside the onStarting callback,
// before start() resolves. Registering after start() has no effect.
//
// ============================================================================

import {
  rootServer,
  RootAppStartState,
  Client,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  ChannelGuid,
  RootServerException,
} from "@rootsdk/server-app";
import { itemService } from "./item-service";
import { roomService } from "./room-service";

let capturedCommunityId: CommunityGuid;

async function onStarting(state: RootAppStartState) {
  capturedCommunityId = state.communityId;

  // Register RPC services. Each addService() call registers all RPC methods
  // defined in the service's proto definition. Clients call these methods
  // via the generated client (gen-client).
  //
  // Multiple services can be registered — each one adds its RPC methods
  // independently. Call addService() inside onStarting, before start() resolves.
  rootServer.lifecycle.addService(itemService);
  rootServer.lifecycle.addService(roomService);

  // Subscribe to messages for the self-test command.
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onRpcServicesCommand,
  );
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();

// --- COMMAND HANDLER: /networking-app-services ------------------------------------------
// Self-test: exercises both services internally. In production, clients call
// RPC methods via gen-client — this command is for harness testing only.

async function onRpcServicesCommand(
  evt: ChannelMessageCreatedEvent,
): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/networking-app-services")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // Self-test constructs a Client object to exercise service methods.
    // In production, clients call RPC methods via gen-client and the
    // Client is provided by the framework automatically.
    const testClient: Client = {
      userId: evt.userId,
      communityId: capturedCommunityId,
      deviceIds: [],
    };

    // --- ItemService tests ---
    const created = await itemService.create({ name: "Test Item" }, testClient);
    lines.push(
      `\u2713 item.create: id=${created.item!.id}, name=${created.item!.name}`,
    );

    const listed = await itemService.list({}, testClient);
    lines.push(`\u2713 item.list: ${listed.items.length} item(s)`);

    await itemService.delete({ id: created.item!.id }, testClient);
    lines.push("\u2713 item.delete: removed");

    // Test error handling: deleting a non-existent item throws
    try {
      await itemService.delete({ id: 99999 }, testClient);
      lines.push("\u2717 item.delete: expected error but none thrown");
    } catch (err: unknown) {
      if (err instanceof RootServerException) {
        lines.push(`\u2713 item.delete error: code=${err.code}`);
      } else { throw err; }
    }

    // --- RoomService tests ---
    const joined = await roomService.join(
      { roomId: "test-room" },
      testClient,
    );
    lines.push(`\u2713 room.join: ${joined.memberIds.length} member(s)`);

    await roomService.send(
      { roomId: "test-room", text: "Hello" },
      testClient,
    );
    lines.push("\u2713 room.send: sent");

    await roomService.leave({ roomId: "test-room" }, testClient);
    lines.push("\u2713 room.leave: left");

    // Test error handling: sending after leaving throws
    try {
      await roomService.send(
        { roomId: "test-room", text: "Oops" },
        testClient,
      );
      lines.push("\u2717 room.send: expected error but none thrown");
    } catch (err: unknown) {
      if (err instanceof RootServerException) {
        lines.push(`\u2713 room.send error: code=${err.code}`);
      } else { throw err; }
    }

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const msg = err instanceof RootServerException ? err.message : String(err);
    const parts = [`\u2717 self-test error: ${msg}`];
    if (lines.length > 0) parts.push(lines.join("\n"));
    await messages.create({ channelId, content: parts.join("\n") });
  }
}
