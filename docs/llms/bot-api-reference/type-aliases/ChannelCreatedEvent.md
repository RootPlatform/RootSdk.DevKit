---
path: bot-api-reference/type-aliases/ChannelCreatedEvent.md
audience: bot
category: reference
summary: Event data emitted when a channel becomes visible to your code.
---

> **ChannelCreatedEvent** = `object`

Event data emitted when a channel becomes visible to your code. This includes newly created channels and existing channels that your code can now see due to permission changes.

## Properties

### beforeChannelId?

> `optional` **beforeChannelId**: [`ChannelGuid`](ChannelGuid.md)

Optional ID of the channel that this channel was positioned before.

### channelGroupId

> **channelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The channel group containing the new channel.

### channelPermission

> **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

The effective permissions for the channel.

### channelType

> **channelType**: `number`

The type of channel (Text, ThreadedText, Voice, or App).

### communityAppId?

> `optional` **communityAppId**: [`CommunityAppGuid`](CommunityAppGuid.md)

For app channels, the associated community app ID.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### description?

> `optional` **description**: `string`

Optional description of the channel.

### iconAssetUri?

> `optional` **iconAssetUri**: `string`

Optional URI for the channel icon.

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the created channel.

### name

> **name**: `string`

The name of the channel.

### roleOrMemberIds?

> `optional` **roleOrMemberIds**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)[]

IDs of roles or members with specific access rules on this channel.

### useChannelGroupPermission

> **useChannelGroupPermission**: `boolean`

Whether the channel inherits permissions from its channel group.

### webRtcMembers?

> `optional` **webRtcMembers**: [`WebRtcUserDeviceEvent`](WebRtcUserDeviceEvent.md)[]

For voice channels, the current WebRTC members.