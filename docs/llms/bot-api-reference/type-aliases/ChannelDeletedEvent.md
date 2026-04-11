---
path: bot-api-reference/type-aliases/ChannelDeletedEvent.md
audience: bot
category: reference
summary: Event data emitted when a channel is no longer visible to your code.
---

> **ChannelDeletedEvent** = `object`

Event data emitted when a channel is no longer visible to your code. This includes deleted channels and existing channels that your code can no longer see due to permission changes.

## Properties

### channelGroupId

> **channelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The channel group that contained the deleted channel.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the deleted channel.