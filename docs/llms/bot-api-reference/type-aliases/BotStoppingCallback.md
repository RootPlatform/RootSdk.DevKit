---
path: bot-api-reference/type-aliases/BotStoppingCallback.md
audience: bot
category: reference
summary: Callback invoked during graceful bot server shutdown, before the server disconnects from Root's infrastructure.
---

> **BotStoppingCallback** = () => `Promise`<`void`>

Callback invoked during graceful bot server shutdown, before the server disconnects from Root's infrastructure. Use this to persist state or release resources.

The callback takes no parameters and returns a `Promise<void>`.

## Returns

`Promise`<`void`>