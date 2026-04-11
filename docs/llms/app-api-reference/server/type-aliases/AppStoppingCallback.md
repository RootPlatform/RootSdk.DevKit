---
path: app-api-reference/server/type-aliases/AppStoppingCallback.md
audience: app
category: reference
summary: Callback invoked during graceful app server shutdown, before the server disconnects from Root's infrastructure.
---

> **AppStoppingCallback** = () => `Promise`<`void`>

Callback invoked during graceful app server shutdown, before the server disconnects from Root's infrastructure. Use this to persist state or release resources.

The callback takes no parameters and returns a `Promise<void>`.

## Returns

`Promise`<`void`>