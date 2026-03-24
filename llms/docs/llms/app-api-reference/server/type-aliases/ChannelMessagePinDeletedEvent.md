---
path: app-api-reference/server/type-aliases/ChannelMessagePinDeletedEvent.md
audience: app
category: reference
summary: Event data emitted when a pin is removed from a message.
---

> **ChannelMessagePinDeletedEvent** = `object`

Event data emitted when a pin is removed from a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel where the message was unpinned.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The ID of the message that was unpinned.