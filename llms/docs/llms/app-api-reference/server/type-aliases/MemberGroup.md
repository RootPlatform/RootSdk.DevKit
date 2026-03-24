---
path: app-api-reference/server/type-aliases/MemberGroup.md
audience: app
category: reference
summary: Type alias for `object` (Member Groups).
---

> **MemberGroup** = `object` & [`ReadOnlyMemberGroup`](ReadOnlyMemberGroup.md)

## Type Declaration

### addCommunityRole()

> **addCommunityRole**(`communityRoleId`: `string`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `communityRoleId` | `string` |

#### Returns

`Promise`<`void`>

### addCommunityRoles()

> **addCommunityRoles**(`communityRoleIds`: `string`[]): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `communityRoleIds` | `string`[] |

#### Returns

`Promise`<`void`>

### addUser()

> **addUser**(`userId`: `string`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `userId` | `string` |

#### Returns

`Promise`<`void`>

### addUsers()

> **addUsers**(`userIds`: `string`[]): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `userIds` | `string`[] |

#### Returns

`Promise`<`void`>

### removeCommunityRole()

> **removeCommunityRole**(`communityRoleId`: `string`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `communityRoleId` | `string` |

#### Returns

`Promise`<`void`>

### removeCommunityRoles()

> **removeCommunityRoles**(`communityRoleIds`: `string`[]): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `communityRoleIds` | `string`[] |

#### Returns

`Promise`<`void`>

### removeUser()

> **removeUser**(`userId`: `string`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `userId` | `string` |

#### Returns

`Promise`<`void`>

### removeUsers()

> **removeUsers**(`userIds`: `string`[]): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `userIds` | `string`[] |

#### Returns

`Promise`<`void`>

### update()

> **update**(`data`: `object`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | \{ `communityRoleIds`: `string`[]; `userIds`: `string`[]; \} |
| `data.communityRoleIds` | `string`[] |
| `data.userIds` | `string`[] |

#### Returns

`Promise`<`void`>