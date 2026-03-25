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
  RootGuidUtils,
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

  // Command trigger: user sends "/server-messages <text>" and we reply
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

// List older messages before a given date.
// limit controls batch size: server accepts 10–50 (default 50).
// result.oldCount indicates how many older messages remain beyond this batch.
async function listOlderMessages(
  channelId: ChannelGuid,
  beforeDate: Date,
  limit: number = 50,
): Promise<void> {
  const result = await rootServer.community.channelMessages.list({
    channelId,
    dateAt: beforeDate,
    messageDirectionTake: MessageDirectionTake.Older,
    limit,
  });

  // result.messages     — array of ChannelMessage, oldest first
  // result.oldCount     — count of still-older messages beyond this batch
  // result.newCount     — count of newer messages after dateAt
  // result.referenceMaps — bulk-resolved mentions (users, roles, channels, assets)
  for (const msg of result.messages) {
    console.log(`[${msg.userId}] ${msg.messageContent}`);
  }
}

// List newer messages after a given date.
// Useful for loading messages that arrived while the user was away.
async function listNewerMessages(
  channelId: ChannelGuid,
  afterDate: Date,
  limit: number = 50,
): Promise<void> {
  const result = await rootServer.community.channelMessages.list({
    channelId,
    dateAt: afterDate,
    messageDirectionTake: MessageDirectionTake.Newer,
    limit,
  });

  // result.newCount — count of still-newer messages beyond this batch
  for (const msg of result.messages) {
    console.log(`[${msg.userId}] ${msg.messageContent}`);
  }
}

// List messages in both directions around a date.
// Ideal for initial channel load or jumping to a specific point in history.
async function listMessagesAround(
  channelId: ChannelGuid,
  aroundDate: Date,
  limit: number = 50,
): Promise<void> {
  const result = await rootServer.community.channelMessages.list({
    channelId,
    dateAt: aroundDate,
    messageDirectionTake: MessageDirectionTake.Both,
    limit,
  });

  // Both oldCount and newCount are populated — tells the caller if there
  // are more messages available in either direction.
  console.log(
    `${result.messages.length} messages around date, ` +
    `${result.oldCount} older, ${result.newCount} newer`,
  );
}

// Paginate through all messages in a channel by walking backward in time.
// Uses oldCount to know when to stop and each batch's oldest message
// timestamp as the dateAt for the next request.
async function paginateMessages(
  channelId: ChannelGuid,
): Promise<void> {
  let dateAt = new Date();
  let hasMore = true;

  while (hasMore) {
    const result = await rootServer.community.channelMessages.list({
      channelId,
      dateAt,
      messageDirectionTake: MessageDirectionTake.Older,
      limit: 50,
    });

    for (const msg of result.messages) {
      console.log(`[${msg.userId}] ${msg.messageContent}`);
    }

    // When oldCount is 0 there are no more older messages to fetch.
    hasMore = result.oldCount > 0 && result.messages.length > 0;

    if (hasMore) {
      // Message IDs are time-ordered GUIDs. Extract the timestamp from the
      // oldest message's ID to position the next fetch.
      const oldestMsg = result.messages[result.messages.length - 1];
      dateAt = new Date(RootGuidUtils.toMilliseconds(oldestMsg.id));
    }
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

// --- COMMAND HANDLER: /server-messages <text> -------------------------------------------
//
// Demonstrates typing indicator → reply → edit → get → list → view-time lifecycle.
// User sends "/server-messages hello" and we:
//   1. Shows a typing indicator
//   2. Replies to the user's message with the echoed text
//   3. Edits the reply to add "(edited)" suffix
//   4. Logs the message details via get
//   5. Lists recent messages in the channel
//   6. Marks the channel as read via setViewTime

async function onEchoCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  if (!evt.messageContent?.startsWith("/server-messages ")) return;

  const text = evt.messageContent.substring("/server-messages ".length).trim();

  try {
    // 1. Show typing indicator while we "work"
    await showTypingIndicator(evt.channelId, true);

    // 2. Reply to the user's message (typing indicator clears on send)
    const messageId = await replyToMessage(evt.channelId, evt.id, `Echo: ${text}`);

    // 3. Edit the reply
    await editMessage(evt.channelId, messageId, `Echo: ${text} (edited)`);

    // 4. Read it back
    await getMessage(evt.channelId, messageId);

    // 5. List recent messages (fetch the 10 most recent)
    await listOlderMessages(evt.channelId, new Date(), 10);

    // 6. Mark the channel as read
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
// These fire for messages by OTHER users, bots, and apps in channels you have
// access to. You will NOT receive events for your own messages.
// Check evt.messageType to filter system messages.

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
