---
path: app-api-reference/server/type-aliases/ClientEvents.md
audience: app
category: reference
summary: Event map type for `AttachedClients`. This type defines the event signatures for client attachment events.
---

> **ClientEvents** = `object`

Event map type for `AttachedClients`. This type defines the event signatures for client attachment events.

For event name constants, see `ClientEvent`.

## Properties

### user.attached

> **user.attached**: (`event`: [`Client`](Client.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`Client`](Client.md) |

#### Returns

`void`

### user.detached

> **user.detached**: (`event`: [`Client`](Client.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`Client`](Client.md) |

#### Returns

`void`

### user.device.attached

> **user.device.attached**: (`event`: [`ClientContext`](ClientContext.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`ClientContext`](ClientContext.md) |

#### Returns

`void`

### user.device.detached

> **user.device.detached**: (`event`: [`ClientContext`](ClientContext.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`ClientContext`](ClientContext.md) |

#### Returns

`void`