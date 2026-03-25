---
path: app-api-reference/server/type-aliases/RootAppLifecycle.md
audience: app
category: reference
summary: Type alias for `object` (Root Core).
---

> **RootAppLifecycle** = `object`

## Methods

### addService()

> **addService**(`service`: [`RootServerService`](RootServerService.md)): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `service` | [`RootServerService`](RootServerService.md) |

#### Returns

`void`

### start()

> **start**(`startingCallback?`: [`AppStartingCallback`](AppStartingCallback.md), `stoppingCallback?`: `AppStoppingCallback`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `startingCallback?` | [`AppStartingCallback`](AppStartingCallback.md) |
| `stoppingCallback?` | `AppStoppingCallback` |

#### Returns

`Promise`<`void`>

### stop()

> **stop**(): `Promise`<`void`>

#### Returns

`Promise`<`void`>