---
path: bot-api-reference/type-aliases/BotStartingCallback.md
audience: bot
category: reference
summary: Callback invoked during bot server startup, after the database initializes but before the server begins processing events.
---

> **BotStartingCallback** = (`rootStartState`: [`RootBotStartState`](RootBotStartState.md)) => `Promise`<`void`>

Callback invoked during bot server startup, after the database initializes but before the server begins processing events. Use this to set up your bot's initial state from the community's current data.

The callback receives a `RootBotStartState` object containing the community ID, roles, members, and global settings.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rootStartState` | [`RootBotStartState`](RootBotStartState.md) |

## Returns

`Promise`<`void`>