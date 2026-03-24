---
path: app-api-reference/server/type-aliases/CommunityRoleCreateRequest.md
audience: app
category: reference
summary: Request object for creating a new role in the community.
---

> **CommunityRoleCreateRequest** = `object`

Request object for creating a new role in the community.

## Properties

### channelPermission?

> `optional` **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

The default channel permissions to grant. Optional. See `ChannelPermission` for available flags.

### colorHex?

> `optional` **colorHex**: `string`

The hex color code for the role. Optional. Defaults to `#FFFFFF` if not specified.

### communityPermission?

> `optional` **communityPermission**: [`CommunityPermission`](CommunityPermission.md)

The community-level permissions to grant. Optional. See `CommunityPermission` for available flags.

### isMentionable

> **isMentionable**: `boolean`

Whether the role can be mentioned in messages. Required.

### name

> **name**: `string`

The display name for the role. Required.