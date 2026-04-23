# API Sample: Lifecycle (App)

App-specific lifecycle with channelId in start state.

## Source Files

| File | What it covers |
|------|---------------|
| [lifecycle-app.ts](src/lifecycle-app.ts) | Start state inspection (channelId), starting/stopping callbacks |
| [main.ts](src/main.ts) | Entry point — lifecycle.start with callbacks |

## SDK Methods

- `lifecycle.start(startingCallback?, stoppingCallback?)` — connect to the platform
- `lifecycle.stop()` — graceful shutdown

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- No permissions required for lifecycle operations
- `channel.createMessage` — only for the `/server-app-lifecycle` command trigger

## Events

No SDK events for lifecycle.

## Apps vs Bots

**Apps receive `RootAppStartState`** which includes `channelId` — the Root channel where the app is embedded. **Bots receive `RootBotStartState`** which does not include `channelId`. See `lifecycle-bot/` for the bot variant.

For `addService()` and custom RPC services (protobuf-defined client-server methods), see `templates/app/`.

## Key Behaviors

- **`RootAppStartState.channelId`** is the Root channel where the app is embedded. Use this to scope messages or UI to the correct channel.
- **Start state is a snapshot** — it reflects the community at the moment the app connects. It is NOT live-updated; use SDK event subscriptions for real-time changes.
- **`communityRoles`** is `Map<CommunityRoleGuid, { id, name }>` — all roles defined in the community.
- **`communityMembers`** is `Map<UserGuid, Set<CommunityRoleGuid>>` — all members and their assigned roles.
- **`globalSettings`** is `undefined` when no settings are defined in `root-manifest.json`.
- **Stopping callback** runs on SIGTERM, SIGINT, or `rootServer.lifecycle.stop()`. The platform allows ~15 seconds before forcing the process to exit.
