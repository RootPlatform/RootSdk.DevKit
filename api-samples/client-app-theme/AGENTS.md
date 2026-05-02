---
kind: api-sample
category: client-app
description: Detect the current light or dark theme mode and subscribe to theme changes from the client
domain: Theming
key_methods: [getTheme, on, off, ThemeUpdate]
---

# API Sample: Client App Theme

How to read the current Root theme mode (`light` or `dark`) from the client and subscribe to changes. CSS variables (`--rootsdk-*`) are applied automatically by the platform and update without any listener — reach for this api when you need programmatic logic that branches on the mode (swapping image assets, configuring canvas/WebGL colors, telling a third-party library which theme to use).

## Source Files

| File | What it covers |
|------|---------------|
| [App.tsx](client/src/App.tsx) | Mounts the demo panel |
| [ThemeDemo.tsx](client/src/ThemeDemo.tsx) | `rootClient.theme.getTheme()`, `on/off(ThemeUpdate)`, and references to `--rootsdk-*` CSS variables |
| [index.tsx](client/src/index.tsx) | React entry point |
| [main.ts](server/src/main.ts) | Stub server (this api sample demonstrates client APIs only) |

## SDK Methods

- `rootClient.theme.getTheme()` — synchronously returns the current `RootThemeMode` (`"light"` or `"dark"`). The theme is read-only; only the platform can change it.
- `rootClient.theme.on(RootClientThemeEvent.ThemeUpdate, handler)` — subscribe to theme changes. Handler receives the new `RootThemeMode`.
- `rootClient.theme.off(RootClientThemeEvent.ThemeUpdate, handler)` — unsubscribe. Always pair with `on` in a `useEffect` cleanup to avoid leaks.

## Permissions

```json
{
  "permissions": {}
}
```

No permissions required.

## Notes

- The theme is **read-only**. There is no `setTheme` — the user picks the mode in Root, and apps follow.
- Only two modes exist: `"light"` and `"dark"`. There is no `"auto"` or `"system"` value to handle.
- For pure CSS styling, **no event listener is needed** — `--rootsdk-*` variables are applied to the document root by the platform and re-resolve automatically when the theme switches. Use the event only for non-CSS logic (asset swaps, canvas redraws, third-party config).
- For the canonical token catalog (every `--rootsdk-*` variable, copy-paste component patterns, the Root icon set), see [`apps/themes`](../../apps/themes). It's the companion reference to this api sample.
