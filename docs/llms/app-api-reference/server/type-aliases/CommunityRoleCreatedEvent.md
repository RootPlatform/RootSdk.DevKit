---
path: app-api-reference/server/type-aliases/CommunityRoleCreatedEvent.md
audience: app
category: reference
summary: Event payload emitted when a new role is created in the community.
---

> **CommunityRoleCreatedEvent** = `object`

Event payload emitted when a new role is created in the community.

## Properties

### beforeCommunityRoleId?

> `optional` **beforeCommunityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The ID of the role that appears after this role in the list. May be undefined if this role is at the end of the list.

### channelPermission

> **channelPermission**: [`ChannelPermission`](ChannelPermission.md)

The default channel permissions granted by this role.

### colorHex

> **colorHex**: `string`

The hex color code of the role.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the role was created.

### communityPermission

> **communityPermission**: [`CommunityPermission`](CommunityPermission.md)

The community-level permissions granted by this role.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the newly created role.

### isMentionable

> **isMentionable**: `boolean`

Whether the role can be mentioned in messages.

### name

> **name**: `string`

The display name of the role.