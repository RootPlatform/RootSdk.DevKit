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

> `optional` **channelPermission?**: [`ChannelPermission`](ChannelPermission.md)

The new default channel permissions. Optional. See `ChannelPermission` for available flags.

### colorHex

> **colorHex**: `string`

The new hex color code for the role, in `#RRGGBB` format (a `#` followed by 6 hexadecimal digits). Required.

### communityPermission?

> `optional` **communityPermission?**: [`CommunityPermission`](CommunityPermission.md)

The new community-level permissions. Optional. See `CommunityPermission` for available flags.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role to edit. Required.

### isMentionable

> **isMentionable**: `boolean`

Whether the role can be mentioned in messages. Required.

### isSelfAssignable

> **isSelfAssignable**: `boolean`

### name

> **name**: `string`

The new display name for the role. Required. Must be 1 to 100 characters and contain only letters, numbers, and hyphens. Spaces are not allowed, and the name cannot start or end with a hyphen or contain consecutive hyphens. A name that violates these rules fails with `RequestValidationFailed`. Note: the `@everyone` role's name cannot be changed.