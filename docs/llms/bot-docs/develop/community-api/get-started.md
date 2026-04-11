---
path: bot-docs/develop/community-api/get-started.md
audience: bot
category: guide
summary: This guide walks you through the core patterns for using the community access API: subscribing to events and calling methods.
---

# Get started with community access

This guide walks you through the core patterns for using the community access API: subscribing to events and calling methods.

## Subscribe to events

Most apps start by subscribing to community events at startup. Use the `on` method on any client to register an event handler.

```ts
import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
} from "@rootsdk/server-bot";

// At startup, subscribe to be notified when members post messages
(async () => {
  rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageCreated, onMessage);
  await rootServer.lifecycle.start();
})();

async function onMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  console.log(`Message received: ${evt.messageContent}`);
}
```

Use the event enum (like `ChannelMessageEvent.ChannelMessageCreated`) rather than the raw string `'channelMessage.created'`. The enum provides type safety and autocomplete.

## Call API methods

Each client provides methods to create, read, update, and delete resources. Methods return promises and throw `RootApiException` on failure.

```ts
import {
  rootServer,
  ChannelMessage,
  ChannelMessageCreateRequest,
} from "@rootsdk/server-bot";

async function sendMessage(channelId: string, content: string): Promise<ChannelMessage> {
  const request: ChannelMessageCreateRequest = { channelId, content };
  return await rootServer.community.channelMessages.create(request);
}
```

## Example: Echo every message

Here's a complete example that combines event subscription and method calls to echo every message posted in the community:

```ts
import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageCreateRequest,
} from "@rootsdk/server-bot";

// At startup, subscribe to message events
(async () => {
  rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageCreated, onMessage);
  await rootServer.lifecycle.start();
})();

async function onMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  // Get the incoming message content
  const reply: string = evt.messageContent;

  // Send that same message back to the channel
  const request: ChannelMessageCreateRequest = { channelId: evt.channelId, content: reply };
  await rootServer.community.channelMessages.create(request);
}
```

## Example: Welcome new members

This example listens for new members joining and posts a welcome message to the community's system channel:

```ts
import {
  rootServer,
  Community,
  CommunityMember,
  CommunityEvent,
  CommunityJoinedEvent,
  CommunityMemberGetRequest,
  ChannelMessageCreateRequest,
} from "@rootsdk/server-bot";

// At startup, subscribe to member join events
(async () => {
  rootServer.community.communities.on(CommunityEvent.CommunityJoined, onJoined);
  await rootServer.lifecycle.start();
})();

async function onJoined(evt: CommunityJoinedEvent): Promise<void> {
  // Get the current community to find the system channel
  const community: Community = await rootServer.community.communities.get();

  // Verify the community has a system channel configured
  if (!community.defaultChannelId)
    return;

  // Look up the new member's nickname
  const memberRequest: CommunityMemberGetRequest = { userId: evt.userId };
  const member: CommunityMember = await rootServer.community.communityMembers.get(memberRequest);
  const nickname: string = member.nickname;

  // Post a welcome message
  const messageRequest: ChannelMessageCreateRequest = { channelId: community.defaultChannelId, content: `${nickname} joined` };
  await rootServer.community.channelMessages.create(messageRequest);
}
```