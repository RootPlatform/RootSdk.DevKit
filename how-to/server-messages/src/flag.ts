// ============================================================================
// How-To: Flagging Messages for Moderation
// SDK: channelMessages.flag
// Permissions: channel.createMessage
// Events: ChannelMessageCreated (trigger to auto-flag based on content)
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Flagging reports a message for moderation review. The message is not
// removed or hidden — it is queued for a human moderator to review.
//
// Each flag requires a ContentFlagReason:
//   Other (1), Dmca (2), Copyright (3), Spam (4), Hatespeech (5),
//   Violence (6), Harassment (7), Sexualcontent (8), Misinformation (9),
//   Impersonation (10), Objectionable (11)
//
// ============================================================================

import {
  rootServer,
  RootApiException,
  ErrorCodeType,
  MessageType,
  ContentFlagReason,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelGuid,
  MessageGuid,
  ChannelMessageFlagRequest,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeFlag(): void {
  const messages = rootServer.community.channelMessages;

  // Flag any message that contains a banned word
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onMessageCreatedFlag);
}

// --- OPERATIONS --------------------------------------------------------------

// Flag a message for moderation review.
// The message remains visible — flagging only queues it for moderator review.
async function flagMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
  reason: ContentFlagReason,
): Promise<void> {
  const request: ChannelMessageFlagRequest = { channelId, id: messageId, reason };
  await rootServer.community.channelMessages.flag(request);
}

// --- COMMAND HANDLER: /flag --------------------------------------------------
//
// Flags the command message as spam. Choose the reason based on context —
// see ContentFlagReason enum values in the header.

async function onMessageCreatedFlag(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  if (evt.messageContent !== "/flag") return;

  try {
    await flagMessage(evt.channelId, evt.id, ContentFlagReason.Spam);
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.NotFound:
          console.error("Message not found");
          break;
        default:
          console.error("RootApiException:", err.errorCode);
      }
    } else if (err instanceof Error) {
      console.error("Unexpected error:", err.message);
    }
  }
}
