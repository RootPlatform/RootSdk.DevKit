// ============================================================================
// How-To: Sending Messages
// SDK: channelMessages.create, .get, .edit, .delete, .list, .setTypingIndicator, .setViewTime
// Permissions: channel.createMessage
// Events: ChannelMessageCreated, ChannelMessageEdited, ChannelMessageDeleted
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================

import {
  rootServer,
  RootApiException,
  ErrorCodeType,
  MessageType,
  MessageDirectionTake,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageEditedEvent,
  ChannelMessageDeletedEvent,
  ChannelGuid,
  ChannelMessageSetViewTimeRequest,
  MessageGuid,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeSend(): void {
  const messages = rootServer.community.channelMessages;

  // Command trigger: user sends "/echo <text>" and we reply
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onEchoCommand);

  // Respond to message lifecycle events
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onMessageCreated);
  messages.on(ChannelMessageEvent.ChannelMessageEdited, onMessageEdited);
  messages.on(ChannelMessageEvent.ChannelMessageDeleted, onMessageDeleted);
}

// --- OPERATIONS --------------------------------------------------------------

// Send a new message to a channel.
// Content supports CommonMark markdown: **bold**, *italic*, ~~strike~~,
// `inline code`, ```code blocks```, headings, lists, blockquotes, and links.
// Maximum content length: 10,001 characters.
async function sendMessage(
  channelId: ChannelGuid,
  content: string,
): Promise<MessageGuid> {
  const message = await rootServer.community.channelMessages.create({
    channelId,
    content,
  });

  return message.id;
}

// Send a reply to an existing message.
// parentMessageIds accepts an array — you can reply to multiple messages at once.
// By default, replying does NOT notify the parent message's author.
// Set needsParentMessageNotification to true to send a notification.
async function replyToMessage(
  channelId: ChannelGuid,
  parentMessageId: MessageGuid,
  content: string,
): Promise<MessageGuid> {
  const message = await rootServer.community.channelMessages.create({
    channelId,
    content,
    parentMessageIds: [parentMessageId],
    needsParentMessageNotification: true,
  });

  return message.id;
}

// Show a typing indicator in a channel.
// Call with isTyping: true before starting work, then send the message.
// The indicator clears automatically when a message is sent.
async function showTypingIndicator(
  channelId: ChannelGuid,
  isTyping: boolean,
): Promise<void> {
  await rootServer.community.channelMessages.setTypingIndicator({
    channelId,
    isTyping,
  });
}

// Retrieve a single message by ID.
// Returns the full message object including content, reactions, pins, and metadata.
async function getMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<void> {
  const message = await rootServer.community.channelMessages.get({
    channelId,
    id: messageId,
  });

  // message.messageContent  — the markdown content
  // message.userId          — who sent it
  // message.reactions        — array of { shortcode, userId }
  // message.pinnedAt         — Date if pinned, undefined if not
  // message.editedAt         — Date if edited, undefined if not
  // message.parentMessages   — replied-to messages, if any
  console.log(`Message ${message.id}: ${message.messageContent}`);
}

// Edit an existing message. Can only edit messages created by your code.
// No permission required. The content field replaces the entire message.
// Minimum content length: 1 character (empty/whitespace-only is rejected).
async function editMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
  newContent: string,
): Promise<void> {
  await rootServer.community.channelMessages.edit({
    channelId,
    id: messageId,
    content: newContent,
  });
}

// Delete a message. No permission required for your own messages.
// Requires deleteMessageOther permission to delete messages by others.
async function deleteMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<void> {
  await rootServer.community.channelMessages.delete({
    channelId,
    id: messageId,
  });
}

// List messages in a channel. Returns messages around a given date.
// Use messageDirectionTake to control whether to fetch newer, older, or both.
async function listMessages(
  channelId: ChannelGuid,
): Promise<void> {
  const result = await rootServer.community.channelMessages.list({
    channelId,
    dateAt: new Date(),
    messageDirectionTake: MessageDirectionTake.Older,
  });

  // result.messages — array of ChannelMessage
  // result.oldCount — number of older messages available
  // result.newCount — number of newer messages available
  for (const msg of result.messages) {
    console.log(`[${msg.userId}] ${msg.messageContent}`);
  }
}

// Mark a channel as read (sets the read-receipt / view timestamp).
// No permission required.
async function markChannelRead(
  channelId: ChannelGuid,
): Promise<void> {
  const request: ChannelMessageSetViewTimeRequest = { channelId };
  await rootServer.community.channelMessages.setViewTime(request);
}

// --- COMMAND HANDLER: /echo <text> -------------------------------------------
//
// Demonstrates typing indicator → reply → edit → get → view-time lifecycle.
// User sends "/echo hello" and we:
//   1. Shows a typing indicator
//   2. Replies to the user's message with the echoed text
//   3. Edits the reply to add "(edited)" suffix
//   4. Logs the message details via get
//   5. Marks the channel as read via setViewTime

async function onEchoCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  if (!evt.messageContent?.startsWith("/echo ")) return;

  const text = evt.messageContent.substring("/echo ".length).trim();

  try {
    // 1. Show typing indicator while we "work"
    await showTypingIndicator(evt.channelId, true);

    // 2. Reply to the user's message (typing indicator clears on send)
    const messageId = await replyToMessage(evt.channelId, evt.id, `Echo: ${text}`);

    // 3. Edit the reply
    await editMessage(evt.channelId, messageId, `Echo: ${text} (edited)`);

    // 4. Read it back
    await getMessage(evt.channelId, messageId);

    // 5. Mark the channel as read
    await markChannelRead(evt.channelId);

  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.NoPermissionToCreate:
          console.error("Missing createMessage permission in root-manifest.json");
          break;
        case ErrorCodeType.NotFound:
          console.error("Channel or message not found");
          break;
        case ErrorCodeType.TooManyRequests:
          // Commands are rate-limited to ~5 requests/second.
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
// These fire for ALL messages in channels your app has access to — not just
// messages you sent. Check evt.messageType to filter system messages.

async function onMessageCreated(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  console.log(`New message in ${evt.channelId}: ${evt.messageContent}`);
}

async function onMessageEdited(evt: ChannelMessageEditedEvent): Promise<void> {
  console.log(`Message ${evt.id} edited in ${evt.channelId}: ${evt.messageContent}`);
}

async function onMessageDeleted(evt: ChannelMessageDeletedEvent): Promise<void> {
  console.log(`Message ${evt.id} deleted in ${evt.channelId}`);
}
