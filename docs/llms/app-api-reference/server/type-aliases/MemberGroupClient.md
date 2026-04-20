---
path: app-api-reference/server/type-aliases/MemberGroupClient.md
audience: app
category: reference
summary: Type alias for `MemberGroupClientBase` (Member Groups).
---

> **MemberGroupClient** = `MemberGroupClientBase` & `object`

## Type Declaration

### create()

> **create**(`data`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md)>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | \{ `communityRoleIds`: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]; `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; `userIds`: [`UserGuid`](UserGuid.md)[]; \} |
| `data.communityRoleIds` | [`CommunityRoleGuid`](CommunityRoleGuid.md)[] |
| `data.name` | `string` |
| `data.resourceId` | `string` |
| `data.resourceType` | `string` |
| `data.userIds` | [`UserGuid`](UserGuid.md)[] |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)>

### getByName()

> **getByName**(`query`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | \{ `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; \} |
| `query.name` | `string` |
| `query.resourceId` | `string` |
| `query.resourceType` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

### list()

> **list**(): `Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

#### Returns

`Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

### listByResourceId()

> **listByResourceId**(`query`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md)[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | \{ `resourceId`: `string`; `resourceType`: `string`; \} |
| `query.resourceId` | `string` |
| `query.resourceType` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)[]>

### listResourceIdsForUserId()

> **listResourceIdsForUserId**(`query`: `object`, `user`: `object`): `Promise`<`string`[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | \{ `name`: `string`; `resourceType`: `string`; \} |
| `query.name` | `string` |
| `query.resourceType` | `string` |
| `user` | \{ `userId`: [`UserGuid`](UserGuid.md); \} |
| `user.userId` | [`UserGuid`](UserGuid.md) |

#### Returns

`Promise`<`string`[]>