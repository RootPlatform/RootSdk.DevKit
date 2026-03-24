---
path: bot-api-reference/type-aliases/ChannelGroupCreatedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a channel group becomes visible to your code.
---

> **ChannelGroupCreatedEvent** = `object`

Event payload emitted when a channel group becomes visible to your code. This includes newly created channel groups and existing channel groups that your code can now see due to permission changes. When a channel group becomes visible, you also receive `channel.created` events for each channel within it. The channel group event is emitted before its channel events.

## Properties

### beforeChannelGroupId?

> `optional` **beforeChannelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

Indicates where this channel group was inserted. If set, this channel group appears directly above the specified channel group. If undefined, this channel group is at the bottom of the sidebar.

### channelGroupPermission?

> `optional` **channelGroupPermission**: [`ChannelPermission`](ChannelPermission.md)

Your code's computed permissions on this channel group. Contains boolean flags indicating which actions your code can perform.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community where the channel group was created.

### id

> **id**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the newly created channel group.

### name

> **name**: `string`

The display name of the new channel group.

### roleOrMemberIds?

> `optional` **roleOrMemberIds**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)[]

Array of role or member IDs that have explicit access rules on this channel group.