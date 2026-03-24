---
path: bot-api-reference/type-aliases/ChannelGroupEditedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a visible channel group's properties or permissions change.
---

> **ChannelGroupEditedEvent** = `object`

Event payload emitted when a visible channel group's properties or permissions change.

## Properties

### channelGroupPermission?

> `optional` **channelGroupPermission**: [`ChannelPermission`](ChannelPermission.md)

Your code's computed permissions on this channel group. Contains boolean flags indicating which actions your code can perform. Only included when your code's permissions on this channel group changed; undefined if only other properties (like the name) were edited.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community containing the channel group.

### id

> **id**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the edited channel group.

### name

> **name**: `string`

The current display name of the channel group.

### roleOrMemberIds?

> `optional` **roleOrMemberIds**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)[]

Array of role or member IDs that have explicit access rules on this channel group.