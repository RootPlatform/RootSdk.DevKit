---
kind: api-sample
category: server-community-api
description: Write structured log entries sent to the community, readable by admins in the Root client app settings
domain: App logging
key_methods: [send diagnostic messages to community admins]
---

# API Sample: App Logs

Write structured log entries sent to the community, readable in the app's settings in the Root client by members with the `communityManageApps` permission.

## Source Files

| File | What it covers |
|------|---------------|
| `src/app-logs.ts` | Create log entries at Info, Warn, Error, and Fatal levels |

## SDK Methods

- `rootServer.dataStore.logs.community.create` — write a log entry with a level and message

## Permissions

```json
{}
```

No special permissions required. App logging is always available to your code.

The `channel.createMessage` permission in `root-manifest.json` is only for the `/server-community-logs` command trigger, not for the logging itself.

## Events

None. App logs do not emit real-time events.

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Four log levels:** Info, Warn, Error, Fatal. `CommunityAppLogType.Unspecified` is rejected by the server.
- **Message cannot be empty** — whitespace-only strings are also rejected.
- **Write-only from the SDK** — `create` is the only method available. Logs are read in the app's settings in the Root client by members with the `communityManageApps` permission.
- **No events** — the platform does not emit events when logs are created.
- **No permissions required** — logging is always available to your code.
