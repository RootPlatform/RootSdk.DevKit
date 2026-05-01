---
kind: api-sample
category: server-lifecycle-utilities
description: Bot startup, shutdown, and start state inspection
domain: Bot lifecycle
key_methods: [start, stop, start state]
---

# API Sample: Lifecycle (Bot)

Bot startup, shutdown, and start state inspection.

## Source Files

| File | What it covers |
|------|---------------|
| [lifecycle-bot.ts](src/lifecycle-bot.ts) | Start state inspection, stopping callback, /lifecycle command |

## SDK Methods

- `rootServer.lifecycle.start(startingCallback?, stoppingCallback?)` — connect to the platform and begin receiving events
- `rootServer.lifecycle.stop()` — trigger graceful shutdown (same as SIGTERM)

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- `channel.createMessage` — only for the `/server-bot-lifecycle` command trigger

## Events

None. Lifecycle does not emit events.

## Apps vs Bots

Apps use `RootAppLifecycle` which extends `RootBotLifecycle` with:
- `addService(service)` — registers protobuf RPC services for client-server communication
- `RootAppStartState` adds `channelId` — the channel the app is embedded in
- Community install/uninstall callbacks — `AppCommunityInstallingCallback` and `AppCommunityUninstallingCallback`

A separate `lifecycle-app` api sample will cover these app-specific additions.

## Key Behaviors

- **Call `start()` exactly once** — it connects to the platform, initializes the database, starts the job scheduler, and begins receiving events.
- **Start state is a snapshot** — `RootBotStartState` reflects roles, members, and settings at the moment the bot connects. It is not live-updated; subscribe to SDK events for real-time changes.
- **`RootBotStartState` fields** — `communityId` (CommunityGuid), `communityRoles` (Map of role id/name), `communityMembers` (Map of userId to Set of roleIds), `globalSettings` (undefined if none configured).
- **Stopping callback** — runs on SIGTERM, SIGINT, or `stop()`. Use it for cleanup (close DB connections, flush caches, cancel timers). The platform allows ~15 seconds before forced exit.
- **`stop()` cannot be triggered externally** — there is no platform API to send SIGTERM to a deployed bot. Shutdown happens when the bot process receives a signal or the app is uninstalled from the community.
