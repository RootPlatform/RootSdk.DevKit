---
path: app-api-reference/client/type-aliases/RootClientLifecycle.md
audience: app
category: reference
summary: Lifecycle methods for your app's client-side component. Available via `rootClient.lifecycle`.
---

> **RootClientLifecycle** = `object`

Lifecycle methods for your app's client-side component. Available via `rootClient.lifecycle`.

## Methods

### restart()

> **restart**(`relativeUrl?`: `string`): `void`

Reloads your app's client. If `relativeUrl` is provided, navigates to that URL instead of reloading the current page.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `relativeUrl?` | `string` | A relative URL to navigate to after restart. Optional; omit to reload the current page. |

#### Returns

`void`