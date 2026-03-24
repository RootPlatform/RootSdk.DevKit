---
path: bot-api-reference/type-aliases/CommunityRoleEditRequest.md
audience: bot
category: reference
summary: Request object for modifying an existing role's properties.
---

> **CommunityRoleEditRequest** = `object`

Request object for modifying an existing role's properties.

## Properties

### channelPermission?

> `optional` **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

The new default channel permissions. Optional. See `ChannelPermission` for available flags.

### colorHex

> **colorHex**: `string`

The new hex color code for the role. Required.

### communityPermission?

> `optional` **communityPermission**: [`CommunityPermission`](CommunityPermission.md)

The new community-level permissions. Optional. See `CommunityPermission` for available flags.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role to edit. Required.

### isMentionable

> **isMentionable**: `boolean`

Whether the role can be mentioned in messages. Required.

### name

> **name**: `string`

The new display name for the role. Required. Note: The `@everyone` role's name cannot be changed.