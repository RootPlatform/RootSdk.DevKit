---
path: bot-api-reference/type-aliases/ChannelMessageDeletedEvent.md
audience: bot
category: reference
summary: Event data emitted when a message is deleted from a channel.
---

> **ChannelMessageDeletedEvent** = `object`

Event data emitted when a message is deleted from a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel that contained the message.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

### deletedAt

> **deletedAt**: `Date`

Timestamp when the message was deleted.

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the deleted message.