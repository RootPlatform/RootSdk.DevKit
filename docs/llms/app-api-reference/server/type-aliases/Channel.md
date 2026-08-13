---
path: app-api-reference/server/type-aliases/Channel.md
audience: app
category: reference
summary: Represents a channel within a community. Channels are the primary containers for content and belong to channel groups.
---

> **Channel** = `object`

Represents a channel within a community. Channels are the primary containers for content and belong to channel groups. They support different types including text, threaded text, voice, and app channels.

## Properties

### channelGroupId

> **channelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the channel group that contains this channel.

### channelPermission

> **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

The effective permissions for this channel. See `ChannelPermission` for details.

### channelType

> **channelType**: `number`

The type of channel. See `ChannelType` for values: `Text` (1), `ThreadedText` (2), `Voice` (4), or `App` (8).

### communityAppId?

> `optional` **communityAppId?**: [`CommunityAppGuid`](CommunityAppGuid.md)

For app channels, the ID of the associated community app. Undefined for other channel types.

### description?

> `optional` **description?**: `string`

Optional description of the channel.

### iconAssetUri?

> `optional` **iconAssetUri?**: `string`

Optional URI for the channel icon.

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier for the channel.

### name

> **name**: `string`

The display name of the channel.

### roleOrMemberIds

> **roleOrMemberIds**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)[]

Optional array of role or member IDs that have specific access rules on this channel.

### useChannelGroupPermission

> **useChannelGroupPermission**: `boolean`

When true, the channel inherits permissions from its parent channel group. When false, the channel uses its own permission rules defined by access rules.