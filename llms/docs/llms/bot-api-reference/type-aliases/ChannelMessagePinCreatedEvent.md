---
path: bot-api-reference/type-aliases/ChannelMessagePinCreatedEvent.md
audience: bot
category: reference
summary: Event data emitted when a message is pinned to a channel.
---

> **ChannelMessagePinCreatedEvent** = `object`

Event data emitted when a message is pinned to a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel where the message was pinned.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The ID of the message that was pinned.