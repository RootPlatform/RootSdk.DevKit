// ============================================================================
// API Sample: Message Pins
// SDK: channelMessages.pinCreate, .pinDelete, .pinList
// Permissions: channel.managePinnedMessages
// Events: ChannelMessagePinCreated, ChannelMessagePinDeleted
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================

import {
  rootServer,
  RootApiException,
  ErrorCodeType,
  MessageType,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessagePinCreatedEvent,
  ChannelMessagePinDeletedEvent,
  ChannelGuid,
  MessageGuid,
  ChannelMessagePinCreateRequest,
  ChannelMessagePinDeleteRequest,
  ChannelMessagePinListRequest,
  ChannelMessagePinListResponse,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializePins(): void {
  const messages = rootServer.community.channelMessages;

  // Command triggers: "/pin" and "/unpin" operate on the command message itself
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onPinCommand);

  // Respond to pin changes made by anyone
  messages.on(ChannelMessageEvent.ChannelMessagePinCreated, onPinCreated);
  messages.on(ChannelMessageEvent.ChannelMessagePinDeleted, onPinDeleted);
}

// --- OPERATIONS --------------------------------------------------------------

// Pin a message in a channel. Pinned messages appear in the pinList results.
// Any message can be pinned — you don't need to be the author.
async function pinMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<void> {
  const request: ChannelMessagePinCreateRequest = { channelId, messageId };
  await rootServer.community.channelMessages.pinCreate(request);
}

// Unpin a previously pinned message.
// Unpinning a message that isn't pinned will fail with NotFound.
async function unpinMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<void> {
  const request: ChannelMessagePinDeleteRequest = { channelId, messageId };
  await rootServer.community.channelMessages.pinDelete(request);
}

// List all pinned messages in a channel.
// Returns full ChannelMessage objects (content, reactions, metadata), not just IDs.
async function listPins(
  channelId: ChannelGuid,
): Promise<void> {
  const request: ChannelMessagePinListRequest = { channelId };
  const result: ChannelMessagePinListResponse = await rootServer.community.channelMessages.pinList(request);

  // result.messages — array of pinned ChannelMessage objects
  // result.oldCount — number of older pinned messages
  // result.newCount — number of newer pinned messages
  for (const msg of result.messages) {
    console.log(`Pinned: [${msg.id}] ${msg.messageContent}`);
  }
}

// --- COMMAND HANDLER: /pin and /unpin ----------------------------------------
//
// Example usage in chat:
//   /pin          → pins the command message itself
//   /unpin        → unpins the command message
//   /pins         → lists all pinned messages in the channel

async function onPinCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;

  try {
    if (evt.messageContent === "/pin") {
      await pinMessage(evt.channelId, evt.id);

    } else if (evt.messageContent === "/unpin") {
      await unpinMessage(evt.channelId, evt.id);

    } else if (evt.messageContent === "/pins") {
      await listPins(evt.channelId);
    }
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.NoPermissionToCreate:
          // root-manifest.json is missing the managePinnedMessages permission.
          console.error("Missing managePinnedMessages permission in root-manifest.json");
          break;
        case ErrorCodeType.NotFound:
          // The message doesn't exist or (for unpin) isn't currently pinned.
          console.error("Message not found or not pinned");
          break;
        case ErrorCodeType.TooManyRequests:
          console.error("Rate limited — commands max ~5 req/s");
          break;
        default:
          console.error("RootApiException:", err.errorCode);
      }
    } else if (err instanceof Error) {
      console.error("Unexpected error:", err.message);
    }
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
//
// Pin events fire when OTHER users, bots, and apps pin/unpin a message — not
// your own. You will NOT receive pin events for pins you create or remove.
// The event payload includes channelId and messageId but NOT the userId
// who performed the action (unlike reaction events).

async function onPinCreated(evt: ChannelMessagePinCreatedEvent): Promise<void> {
  console.log(`Message ${evt.messageId} pinned in channel ${evt.channelId}`);
}

async function onPinDeleted(evt: ChannelMessagePinDeletedEvent): Promise<void> {
  console.log(`Message ${evt.messageId} unpinned in channel ${evt.channelId}`);
}
