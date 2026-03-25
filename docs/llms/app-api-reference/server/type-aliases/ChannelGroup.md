---
path: app-api-reference/server/type-aliases/ChannelGroup.md
audience: app
category: reference
summary: Represents a container that organizes channels within a community.
---

> **ChannelGroup** = `object`

Represents a container that organizes channels within a community. Channel groups appear in the community sidebar and can define shared permission settings that contained channels inherit.

## Properties

### channelGroupPermission?

> `optional` **channelGroupPermission**: [`ChannelPermission`](ChannelPermission.md)

Your code's computed permissions on this channel group. Contains boolean flags indicating which actions your code can perform (view, create messages, manage files, etc.). This is the final result after applying all access rules.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community this channel group belongs to.

### id

> **id**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The unique identifier for this channel group.

### name

> **name**: `string`

The display name of the channel group.

### roleOrMemberIds?

> `optional` **roleOrMemberIds**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)[]

Array of role or member IDs that have explicit access rules on this channel group.