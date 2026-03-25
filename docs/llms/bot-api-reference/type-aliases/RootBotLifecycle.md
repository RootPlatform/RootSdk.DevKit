---
path: bot-api-reference/type-aliases/RootBotLifecycle.md
audience: bot
category: reference
summary: Type alias for `object` (Root Core).
---

> **RootBotLifecycle** = `object`

## Methods

### start()

> **start**(`startingCallback?`: [`BotStartingCallback`](BotStartingCallback.md), `stoppingCallback?`: `BotStoppingCallback`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `startingCallback?` | [`BotStartingCallback`](BotStartingCallback.md) |
| `stoppingCallback?` | `BotStoppingCallback` |

#### Returns

`Promise`<`void`>

### stop()

> **stop**(): `Promise`<`void`>

#### Returns

`Promise`<`void`>