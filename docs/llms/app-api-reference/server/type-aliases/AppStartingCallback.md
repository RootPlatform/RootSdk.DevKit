---
path: app-api-reference/server/type-aliases/AppStartingCallback.md
audience: app
category: reference
summary: Callback invoked during app server startup, after the database initializes but before the server begins processing events.
---

> **AppStartingCallback** = (`rootStartState`: [`RootAppStartState`](RootAppStartState.md)) => `Promise`<`void`>

Callback invoked during app server startup, after the database initializes but before the server begins processing events. Use this to set up your app's initial state from the community's current data.

The callback receives a `RootAppStartState` object containing the community ID, roles, members, global settings, and the app's channel ID.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rootStartState` | [`RootAppStartState`](RootAppStartState.md) |

## Returns

`Promise`<`void`>