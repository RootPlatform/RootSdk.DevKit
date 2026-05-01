---
kind: api-sample
category: client-app
description: Restart the client app from inside the iframe and optionally navigate to a different in-app route
domain: Client lifecycle
key_methods: [restart]
---

# API Sample: Client App Lifecycle

How to restart the client app from inside the iframe — a full page reload that resets all in-memory state — and how to deep-link to a different in-app route as part of that restart. Reach for this after applying configuration that requires a fresh start, for error recovery, or to navigate to a specific section of the app.

## Source Files

| File | What it covers |
|------|---------------|
| [App.tsx](client/src/App.tsx) | Mounts the demo panel |
| [RestartPanel.tsx](client/src/RestartPanel.tsx) | `rootClient.lifecycle.restart()` — full reload, and restart with a relative URL |
| [index.tsx](client/src/index.tsx) | React entry point |
| [main.ts](server/src/main.ts) | Stub server (this api sample demonstrates client APIs only) |

## SDK Methods

- `rootClient.lifecycle.restart()` — performs a full page reload. Reloads all JS bundles, clears in-memory state, and reinitializes React from scratch. Equivalent to `window.location.reload()`.
- `rootClient.lifecycle.restart(relativeUrl)` — same full reload, but lands the app at `relativeUrl` (e.g. `"/settings"`) instead of the current page. Equivalent to setting `window.location.href`.

## Permissions

```json
{
  "permissions": {}
}
```

No permissions required.

## Notes

- `restart()` is a hard reload, not a React re-mount — any unsaved client state is lost.
- The call routes through the platform's native bridge. If the bridge doesn't support restart, the call silently no-ops (the SDK guards with optional chaining), so it's safe to invoke unconditionally.
- This api sample only covers `lifecycle.restart`. Other client-side concerns are covered by sibling samples: theme detection lives in `client-app-theme`, current-user identity in `client-app-users`, and client→server calls in `networking-app-services`.
