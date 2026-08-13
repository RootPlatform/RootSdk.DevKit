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

> `optional` **channelPermission?**: [`ChannelPermission`](ChannelPermission.md)

The default channel permissions to grant. Optional. See `ChannelPermission` for available flags.

### colorHex?

> `optional` **colorHex?**: `string`

The hex color code for the role, in `#RRGGBB` format (a `#` followed by 6 hexadecimal digits). Optional. Defaults to `#FFFFFF` if not specified.

### communityPermission?

> `optional` **communityPermission?**: [`CommunityPermission`](CommunityPermission.md)

The community-level permissions to grant. Optional. See `CommunityPermission` for available flags.

### isMentionable

> **isMentionable**: `boolean`

Whether the role can be mentioned in messages. Required.

### isSelfAssignable

> **isSelfAssignable**: `boolean`

### name

> **name**: `string`

The display name for the role. Required. Must be 1 to 100 characters and contain only letters, numbers, and hyphens. Spaces are not allowed, and the name cannot start or end with a hyphen or contain consecutive hyphens. A name that violates these rules fails with `RequestValidationFailed`. To build a role name from arbitrary text (for example, a user-entered tier name), replace each run of disallowed characters with a single hyphen and trim leading and trailing hyphens.