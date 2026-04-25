---
path: app-api-reference/client/type-aliases/RootClientTheme.md
audience: app
category: reference
summary: Provides access to the host Root client's current theme. Available via `rootClient.theme`.
---

> **Worked sample**: `api-samples/client-app-theme/` — Client Theme

> **RootClientTheme** = `object` & [`TypedEventEmitter`](TypedEventEmitter.md)<[`RootClientThemeEvents`](RootClientThemeEvents.md)>

Provides access to the host Root client's current theme. Available via `rootClient.theme`.

## Type Declaration

### getTheme()

> **getTheme**(): [`RootThemeMode`](RootThemeMode.md)

Returns the current theme mode.

#### Returns

[`RootThemeMode`](RootThemeMode.md)

The current `RootThemeMode` (`"light"` or `"dark"`).