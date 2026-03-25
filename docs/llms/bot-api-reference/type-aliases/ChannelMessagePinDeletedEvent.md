---
path: bot-api-reference/type-aliases/ChannelMessagePinDeletedEvent.md
audience: bot
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