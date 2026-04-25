---
path: app-api-reference/server/type-aliases/RootAppLifecycle.md
audience: app
category: reference
summary: Manages the startup and shutdown sequence for your app's server. Access via `rootServer.lifecycle`.
---

> **Worked sample**: `api-samples/server-app-lifecycle/` — App Lifecycle

> **RootAppLifecycle** = `object`

Manages the startup and shutdown sequence for your app's server. Access via `rootServer.lifecycle`.

During startup, the lifecycle initializes the database, starts the job scheduler, connects event handlers, and establishes the connection to Root's infrastructure. During shutdown, it runs your stopping callback and disconnects gracefully.

## Methods

### addService()

> **addService**(`service`: [`RootServerService`](RootServerService.md)): `void`

Registers a custom service definition with the server. Service definitions enable custom client-to-server communication. Each service defines methods that your app's client code can call.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `service` | [`RootServerService`](RootServerService.md) | A `RootServerService` object containing your service's method definitions. |

#### Returns

`void`

### start()

> **start**(`startingCallback?`: [`AppStartingCallback`](AppStartingCallback.md), `stoppingCallback?`: [`AppStoppingCallback`](AppStoppingCallback.md)): `Promise`<`void`>

Starts the app server. Call this once in your entry point. The method initializes all internal systems (database, job scheduler, event handlers) and connects to Root's infrastructure. If you provide a `startingCallback`, it runs after the database initializes but before the server begins processing events.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `startingCallback?` | [`AppStartingCallback`](AppStartingCallback.md) | Optional `AppStartingCallback` that receives a `RootAppStartState` containing the community's current roles, members, global settings, and the app's channel ID. Use this to initialize your app's state from the community's current data. |
| `stoppingCallback?` | [`AppStoppingCallback`](AppStoppingCallback.md) | Optional `AppStoppingCallback` that runs during graceful shutdown before the server disconnects. Use this to persist state or release resources. |

#### Returns

`Promise`<`void`>

A promise that resolves when the server is fully started and connected.

### stop()

> **stop**(): `Promise`<`void`>

Initiates graceful shutdown. Runs your stopping callback (if provided during `start`), then disconnects from Root's infrastructure. The server forces exit after 15 seconds if shutdown doesn't complete.

#### Returns

`Promise`<`void`>

A promise that resolves when the server has stopped.