---
path: bot-api-reference/type-aliases/ChannelEditedEvent.md
audience: bot
category: reference
summary: Event data emitted when a visible channel's properties or permissions change.
---

> **ChannelEditedEvent** = `object`

Event data emitted when a visible channel's properties or permissions change.

## Properties

### channelGroupId

> **channelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The channel group containing the channel.

### channelPermission?

> `optional` **channelPermission?**: [`ChannelPermission`](ChannelPermission.md)

Optional updated permissions for the channel.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### description?

> `optional` **description?**: `string`

Optional updated description.

### iconAssetUri?

> `optional` **iconAssetUri?**: `string`

Optional updated icon URI.

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the edited channel.

### name

> **name**: `string`

The updated name of the channel.

### roleOrMemberIds

> **roleOrMemberIds**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)[]

Updated IDs of roles or members with specific access rules.

### useChannelGroupPermission

> **useChannelGroupPermission**: `boolean`

Whether the channel inherits permissions from its channel group.