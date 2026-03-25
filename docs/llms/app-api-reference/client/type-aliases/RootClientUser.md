---
path: app-api-reference/client/type-aliases/RootClientUser.md
audience: app
category: reference
summary: Type alias for `object` (Root Core).
---

> **RootClientUser** = `object`

## Methods

### getCurrentUserId()

> **getCurrentUserId**(): [`UserGuid`](UserGuid.md)

#### Returns

[`UserGuid`](UserGuid.md)

### getUserProfile()

> **getUserProfile**(`userId`: `string`): `Promise`<[`UserProfile`](UserProfile.md)>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `userId` | `string` |

#### Returns

`Promise`<[`UserProfile`](UserProfile.md)>

### getUserProfiles()

> **getUserProfiles**(`userIds`: `string`[]): `Promise`<[`UserProfile`](UserProfile.md)[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `userIds` | `string`[] |

#### Returns

`Promise`<[`UserProfile`](UserProfile.md)[]>

### showUserProfile()

> **showUserProfile**(`userId`: `string`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `userId` | `string` |

#### Returns

`void`