---
path: bot-api-reference/type-aliases/MemberGroupClient.md
audience: bot
category: reference
summary: Service with methods: create, delete, get, getByName, ... (Member Groups).
---

> **MemberGroupClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`MemberGroupEvents`](MemberGroupEvents.md)> & `object`

## Type Declaration

### create()

> **create**(`data`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md)>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | \{ `communityId?`: `string`; `communityRoleIds`: `string`[]; `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; `userIds`: `string`[]; \} |
| `data.communityId?` | `string` |
| `data.communityRoleIds` | `string`[] |
| `data.name` | `string` |
| `data.resourceId` | `string` |
| `data.resourceType` | `string` |
| `data.userIds` | `string`[] |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)>

### delete()

> **delete**(`id`: `string`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`Promise`<`void`>

### get()

> **get**(`id`: `string`): `Promise`<[`MemberGroup`](MemberGroup.md)>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)>

### getByName()

> **getByName**(`data`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | \{ `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; \} |
| `data.name` | `string` |
| `data.resourceId` | `string` |
| `data.resourceType` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

### list()

> **list**(): `Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

#### Returns

`Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

### listByIds()

> **listByIds**(`ids`: `string`[]): `Promise`<[`MemberGroup`](MemberGroup.md)[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ids` | `string`[] |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)[]>

### listByResourceId()

> **listByResourceId**(`query`: `object`, `communityId?`: `string`): `Promise`<[`MemberGroup`](MemberGroup.md)[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | \{ `resourceId`: `string`; `resourceType`: `string`; \} |
| `query.resourceId` | `string` |
| `query.resourceType?` | `string` |
| `communityId?` | `string` |

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
| `user` | \{ `communityId?`: `string`; `userId`: `string`; \} |
| `user.communityId?` | `string` |
| `user.userId` | `string` |

#### Returns

`Promise`<`string`[]>