---
path: bot-api-reference/type-aliases/MemberGroup.md
audience: bot
category: reference
summary: A named collection of individual users and community roles combined into a single audience.
---

> **MemberGroup** = `object` & [`ReadOnlyMemberGroup`](ReadOnlyMemberGroup.md)

A named collection of individual users and community roles combined into a single audience. The `memberUserIds` property contains the resolved set of all users who belong to the group, whether added directly or through community role membership.

This read-write type extends `ReadOnlyMemberGroup` with methods for modifying the group's membership.

## Type Declaration

### addCommunityRole()

> **addCommunityRole**(`communityRoleId`: [`CommunityRoleGuid`](CommunityRoleGuid.md)): `Promise`<`void`>

Adds a community role to this group. Users with this role will be included in the resolved membership.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `communityRoleId` | [`CommunityRoleGuid`](CommunityRoleGuid.md) | The ID of the community role to add. |

#### Returns

`Promise`<`void`>

#### Throws

`Error` If the role is already in this group or if the role ID does not match a role in the community.

### addCommunityRoles()

> **addCommunityRoles**(`communityRoleIds`: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]): `Promise`<`void`>

Adds multiple community roles to this group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `communityRoleIds` | [`CommunityRoleGuid`](CommunityRoleGuid.md)[] | An array of community role IDs to add. |

#### Returns

`Promise`<`void`>

#### Throws

`Error` If any role is already in this group or if any role ID does not match a role in the community.

### addUser()

> **addUser**(`userId`: [`UserGuid`](UserGuid.md)): `Promise`<`void`>

Adds a single user directly to this group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userId` | [`UserGuid`](UserGuid.md) | The ID of the user to add. |

#### Returns

`Promise`<`void`>

#### Throws

`Error` If the user is already a direct member of this group.

### addUsers()

> **addUsers**(`userIds`: [`UserGuid`](UserGuid.md)[]): `Promise`<`void`>

Adds multiple users directly to this group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userIds` | [`UserGuid`](UserGuid.md)[] | An array of user IDs to add. |

#### Returns

`Promise`<`void`>

#### Throws

`Error` If any user is already a direct member of this group.

### removeCommunityRole()

> **removeCommunityRole**(`communityRoleId`: [`CommunityRoleGuid`](CommunityRoleGuid.md)): `Promise`<`void`>

Removes a community role from this group. Users who only belonged through this role will no longer be resolved members. No effect if the role is not in this group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `communityRoleId` | [`CommunityRoleGuid`](CommunityRoleGuid.md) | The ID of the community role to remove. |

#### Returns

`Promise`<`void`>

### removeCommunityRoles()

> **removeCommunityRoles**(`communityRoleIds`: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]): `Promise`<`void`>

Removes multiple community roles from this group. Roles not in this group are silently ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `communityRoleIds` | [`CommunityRoleGuid`](CommunityRoleGuid.md)[] | An array of community role IDs to remove. |

#### Returns

`Promise`<`void`>

### removeUser()

> **removeUser**(`userId`: [`UserGuid`](UserGuid.md)): `Promise`<`void`>

Removes a single user from this group's direct membership. No effect if the user is not a direct member.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userId` | [`UserGuid`](UserGuid.md) | The ID of the user to remove. |

#### Returns

`Promise`<`void`>

### removeUsers()

> **removeUsers**(`userIds`: [`UserGuid`](UserGuid.md)[]): `Promise`<`void`>

Removes multiple users from this group's direct membership. Users not in the group are silently ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userIds` | [`UserGuid`](UserGuid.md)[] | An array of user IDs to remove. |

#### Returns

`Promise`<`void`>

### update()

> **update**(`data`: `object`): `Promise`<`void`>

Replaces the group's direct user list and community role list entirely.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | \{ `communityRoleIds`: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]; `userIds`: [`UserGuid`](UserGuid.md)[]; \} | An object containing the new membership. |
| `data.communityRoleIds` | [`CommunityRoleGuid`](CommunityRoleGuid.md)[] | The new array of community role IDs. |
| `data.userIds` | [`UserGuid`](UserGuid.md)[] | The new array of direct user IDs. |

#### Returns

`Promise`<`void`>