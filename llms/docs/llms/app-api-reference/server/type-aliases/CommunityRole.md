---
path: app-api-reference/server/type-aliases/CommunityRole.md
audience: app
category: reference
summary: Represents a role within a community. Roles define permission sets that can be assigned to members.
---

> **CommunityRole** = `object`

Represents a role within a community. Roles define permission sets that can be assigned to members. Each role has both community-level permissions (such as managing members or roles) and channel-level permissions (such as sending messages or managing channels).

## Properties

### channelPermission

> **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

The channel permissions granted by this role. See `ChannelPermission` for available permission flags.

### colorHex

> **colorHex**: `string`

The hex color code for the role, used when displaying member names. Format: `#RRGGBB`.

### communityPermission

> **communityPermission**: [`CommunityPermission`](CommunityPermission.md)

The community-level permissions granted by this role. See `CommunityPermission` for available permission flags.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier for the role.

### isMentionable

> **isMentionable**: `boolean`

When true, community members can mention this role using `@RoleName` in messages.

### name

> **name**: `string`

The display name of the role.