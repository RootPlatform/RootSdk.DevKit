---
path: bot-api-reference/type-aliases/CommunityRoleEditedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a role's properties are modified.
---

> **CommunityRoleEditedEvent** = `object`

Event payload emitted when a role's properties are modified.

## Properties

### beforeCommunityRoleId?

> `optional` **beforeCommunityRoleId?**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The ID of the role that appears after this role in the list. May be undefined.

### channelPermission

> **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

The updated default channel permissions.

### colorHex

> **colorHex**: `string`

The updated hex color code of the role.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the role exists.

### communityPermission

> **communityPermission**: [`CommunityPermission`](CommunityPermission.md)

The updated community-level permissions.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the edited role.

### isMentionable

> **isMentionable**: `boolean`

The updated mentionable setting.

### isSelfAssignable

> **isSelfAssignable**: `boolean`

### name

> **name**: `string`

The updated display name of the role.