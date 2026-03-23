// ============================================================================
// How-To: Message Reactions
// SDK: channelMessages.reactionCreate, channelMessages.reactionDelete
// Permissions: channel.createMessageReaction
// Events: ChannelMessageReactionCreated, ChannelMessageReactionDeleted
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
  ChannelMessageReactionCreatedEvent,
  ChannelMessageReactionDeletedEvent,
  ChannelGuid,
  MessageGuid,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeReactions(): void {
  const messages = rootServer.community.channelMessages;

  // Command trigger: user sends "/react thumbsup" to react to their own message
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onReactCommand);

  // Respond to reaction changes made by anyone
  messages.on(ChannelMessageEvent.ChannelMessageReactionCreated, onReactionCreated);
  messages.on(ChannelMessageEvent.ChannelMessageReactionDeleted, onReactionDeleted);
}

// --- OPERATIONS --------------------------------------------------------------

// Add an emoji reaction to an existing message.
// The shortcode must include colons, e.g. ":thumbsup:", ":heart:".
async function addReaction(
  channelId: ChannelGuid,
  messageId: MessageGuid,
  shortcode: string,
): Promise<void> {
  await rootServer.community.channelMessages.reactionCreate({
    channelId,
    messageId,
    shortcode,
  });
}

// Remove a reaction that YOUR CODE previously added.
// Apps and bots can only remove their own reactions — attempting to remove
// a reaction added by someone else will fail with NotFound.
async function removeReaction(
  channelId: ChannelGuid,
  messageId: MessageGuid,
  shortcode: string,
): Promise<void> {
  await rootServer.community.channelMessages.reactionDelete({
    channelId,
    messageId,
    shortcode,
  });
}

// --- COMMAND HANDLER: /react <emoji> -----------------------------------------
//
// Example usage in chat:
//   /react thumbsup     → reacts with :thumbsup: to the command message
//   /unreact heart      → removes the :heart: reaction from the command message
//
// Note: ChannelMessageCreatedEvent uses evt.id for the message ID (not evt.messageId).
// The evt.messageId field does not exist on this event type.

async function onReactCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;

  try {
    if (evt.messageContent?.startsWith("/react ")) {
      const emoji = evt.messageContent.substring("/react ".length).trim();
      const shortcode = ":" + emoji + ":";

      await addReaction(evt.channelId, evt.id, shortcode);

    } else if (evt.messageContent?.startsWith("/unreact ")) {
      const emoji = evt.messageContent.substring("/unreact ".length).trim();
      const shortcode = ":" + emoji + ":";

      await removeReaction(evt.channelId, evt.id, shortcode);
    }
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.NoPermissionToCreate:
          // root-manifest.json is missing the createMessageReaction permission.
          console.error("Missing createMessageReaction permission in root-manifest.json");
          break;
        case ErrorCodeType.NotFound:
          // The message doesn't exist, was deleted, or (for unreact) your code
          // didn't have that reaction on the message.
          console.error("Message or reaction not found");
          break;
        case ErrorCodeType.TooManyRequests:
          // Commands are rate-limited to ~5 requests/second.
          // Consider adding a delay between rapid reaction operations.
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
// These fire when ANY user or app adds/removes a reaction — not just yours.
// The event payload includes the shortcode, messageId, channelId, and userId
// of whoever performed the action.

async function onReactionCreated(evt: ChannelMessageReactionCreatedEvent): Promise<void> {
  console.log(
    `Reaction ${evt.shortcode} added to message ${evt.messageId} ` +
    `in channel ${evt.channelId} by user ${evt.userId}`
  );
}

async function onReactionDeleted(evt: ChannelMessageReactionDeletedEvent): Promise<void> {
  console.log(
    `Reaction ${evt.shortcode} removed from message ${evt.messageId} ` +
    `in channel ${evt.channelId} by user ${evt.userId}`
  );
}
