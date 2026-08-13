---
path: bot-api-reference/type-aliases/ChannelMessageDeletedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a message is deleted from a channel.
---

> **ChannelMessageDeletedEvent** = `object`

Event payload emitted when a message is deleted from a channel. Contains only the message ID and deletion timestamp; the message content is not included.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel that contained the message.

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### deletedAt

> **deletedAt**: `Date`

When the message was deleted.

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the deleted message.