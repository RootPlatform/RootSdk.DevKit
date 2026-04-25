---
path: bot-api-reference/type-aliases/GlobalSettings.md
audience: bot
category: reference
summary: Community-scoped global settings container. Provides keyed access to setting values by group and item, and emits events when settings change.
---

> **Worked sample**: `api-samples/server-global-settings/` — Global Settings

> **GlobalSettings** = `object` & [`TypedEventEmitter`](TypedEventEmitter.md)<[`GlobalSettingsEvents`](GlobalSettingsEvents.md)>

Community-scoped global settings container. Provides keyed access to setting values by group and item, and emits events when settings change.

Access this object via `rootServer.globalSettings`.

Settings are accessed by group key and then item key, matching the structure declared in your manifest:

```
rootServer.globalSettings[groupKey][itemKey]
```

For event name constants, see `GlobalSettingsEvents`.