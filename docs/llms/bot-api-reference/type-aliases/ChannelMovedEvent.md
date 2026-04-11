---
path: bot-api-reference/type-aliases/ChannelMovedEvent.md
audience: bot
category: reference
summary: Event data emitted when a visible channel is moved to a different position or channel group.
---

> **ChannelMovedEvent** = `object`

Event data emitted when a visible channel is moved to a different position or channel group.

## Properties

### beforeChannelId?

> `optional` **beforeChannelId**: [`ChannelGuid`](ChannelGuid.md)

Optional ID of the channel that this channel is now positioned before.

### channelGroupId

> **channelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The new channel group ID (after the move).

### channelPermission?

> `optional` **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

Optional updated permissions if they changed due to the move.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the moved channel.

### roleOrMemberIds

> **roleOrMemberIds**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)[]

Updated IDs of roles or members with specific access rules.