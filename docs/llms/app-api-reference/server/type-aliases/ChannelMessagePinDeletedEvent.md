---
path: app-api-reference/server/type-aliases/ChannelMessagePinDeletedEvent.md
audience: app
category: reference
summary: Event payload emitted when a pin is removed from a message.
---

> **ChannelMessagePinDeletedEvent** = `object`

Event payload emitted when a pin is removed from a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel where the message was unpinned.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the unpinned message.