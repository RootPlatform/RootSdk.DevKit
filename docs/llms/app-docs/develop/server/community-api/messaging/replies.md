---
path: app-docs/develop/server/community-api/messaging/replies.md
audience: app
category: guide
summary: Send messages that reference other messages, creating conversational context for your responses.
---

# Message replies

Send messages that reference other messages, creating conversational context for your responses.

## What are replies?

A *reply* is a message that references one or more parent messages. When users view a reply in the Root client, they see a preview of the parent message above it, making it clear what the reply is responding to.

Replies are useful when your code needs to respond to specific messages rather than posting to a channel generically. For example, if your code processes commands, replying to the command message makes it obvious which command triggered the response.

## Create a reply

To create a reply, include the `parentMessageIds` field in your `ChannelMessageCreateRequest`. This field accepts an array of message IDs:

```ts
import {
  rootServer,
  ChannelMessageCreateRequest,
  ChannelMessageCreatedEvent,
  ChannelMessageEvent,
} from "@rootsdk/server-app";

async function handleMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (!evt.messageContent?.startsWith("!help")) {
    return;
  }

  const request: ChannelMessageCreateRequest = {
    channelId: evt.channelId,
    content: "Here are the available commands: !help, !status, !ping",
    parentMessageIds: [evt.id],
  };

  await rootServer.community.channelMessages.create(request);
}

rootServer.community.channelMessages.on(
  ChannelMessageEvent.ChannelMessageCreated,
  handleMessage
);
```

The reply appears in the channel with a reference to the original message, so users can see the context.

## Control notifications

By default, replying to a message does not notify the parent message's author. If you want the author to receive a notification, set `needsParentMessageNotification` to `true`:

```ts
const request: ChannelMessageCreateRequest = {
  channelId: evt.channelId,
  content: "Your request has been processed.",
  parentMessageIds: [evt.id],
  needsParentMessageNotification: true,
};
```

**When to notify:**
- The reply contains information the author specifically requested
- The author is waiting for a response

**When not to notify:**
- The reply is a general acknowledgment (e.g., "Command received")
- The author is already viewing the channel
- Your code replies frequently and notifications would become noise

## Read reply context

When you receive a message (via events or API calls), the `parentMessages` field contains information about any parent messages:

```ts
function handleReply(evt: ChannelMessageCreatedEvent): void {
  if (!evt.parentMessages?.length) {
    return;
  }

  for (const parent of evt.parentMessages) {
    console.log(`This is a reply to message ${parent.id}`);
    console.log(`Original author: ${parent.userId}`);
    console.log(`Original content: ${parent.messageContent}`);
  }
}

rootServer.community.channelMessages.on(
  ChannelMessageEvent.ChannelMessageCreated,
  handleReply
);
```

Each `ParentMessage` includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `MessageGuid` | The parent message's ID |
| `userId` | `UserGuid` (optional) | The author of the parent message |
| `messageContent` | `string` (optional) | The text content of the parent message |

## Reply to multiple messages

Include multiple IDs in the `parentMessageIds` array to reply to several messages at once:

```ts
const request: ChannelMessageCreateRequest = {
  channelId: channelId,
  content: "This addresses both of your questions.",
  parentMessageIds: [messageId1, messageId2],
};
```

**Limits and display:**

- Maximum of 5 parent message IDs per reply
- The Root client displays all parent messages stacked vertically above the reply
- Display order is determined by the Root clients