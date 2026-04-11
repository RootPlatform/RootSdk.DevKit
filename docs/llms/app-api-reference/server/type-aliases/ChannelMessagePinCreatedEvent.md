---
path: app-api-reference/server/type-aliases/ChannelMessagePinCreatedEvent.md
audience: app
category: reference
summary: Event payload emitted when a message is pinned in a channel.
---

> **ChannelMessagePinCreatedEvent** = `object`

Event payload emitted when a message is pinned in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel where the message was pinned.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the pinned message.