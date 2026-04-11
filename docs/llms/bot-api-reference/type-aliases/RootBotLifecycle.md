---
path: bot-api-reference/type-aliases/RootBotLifecycle.md
audience: bot
category: reference
summary: Manages the startup and shutdown sequence for your bot's server. Access via `rootServer.lifecycle`.
---

> **RootBotLifecycle** = `object`

Manages the startup and shutdown sequence for your bot's server. Access via `rootServer.lifecycle`.

During startup, the lifecycle initializes the database, starts the job scheduler, connects event handlers, and establishes the connection to Root's infrastructure. During shutdown, it runs your stopping callback and disconnects gracefully.

## Methods

### start()

> **start**(`startingCallback?`: [`BotStartingCallback`](BotStartingCallback.md), `stoppingCallback?`: [`BotStoppingCallback`](BotStoppingCallback.md)): `Promise`<`void`>

Starts the bot server. Call this once in your entry point. The method initializes all internal systems (database, job scheduler, event handlers) and connects to Root's infrastructure. If you provide a `startingCallback`, it runs after the database initializes but before the server begins processing events.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `startingCallback?` | [`BotStartingCallback`](BotStartingCallback.md) | Optional `BotStartingCallback` that receives a `RootBotStartState` containing the community's current roles, members, and global settings. Use this to initialize your bot's state from the community's current data. |
| `stoppingCallback?` | [`BotStoppingCallback`](BotStoppingCallback.md) | Optional `BotStoppingCallback` that runs during graceful shutdown before the server disconnects. Use this to persist state or release resources. |

#### Returns

`Promise`<`void`>

A promise that resolves when the server is fully started and connected.

### stop()

> **stop**(): `Promise`<`void`>

Initiates graceful shutdown. Runs your stopping callback (if provided during `start`), then disconnects from Root's infrastructure. The server forces exit after 15 seconds if shutdown doesn't complete.

#### Returns

`Promise`<`void`>

A promise that resolves when the server has stopped.