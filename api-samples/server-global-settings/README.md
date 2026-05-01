---
kind: api-sample
category: server-lifecycle-utilities
description: Read manifest-declared global settings at startup and runtime, and react when admins edit them
domain: Global settings
key_methods: [globalSettings, state.globalSettings, GlobalSettingsEvent.Update, ReadOnlyMemberGroup.isMember]
---

# API Sample: Global Settings

How to expose configuration to community admins through the Root platform UI and read it back from your server. Settings are declared in `root-manifest.json` (groups → items), edited by admins in Root, and read at startup via `state.globalSettings` or at runtime via `rootServer.globalSettings`. Subscribe to `GlobalSettingsEvent.Update` to react when an admin changes a value.

This is the canonical primitive whenever you need anything an admin can tune — VIP roles, feature toggles, configurable channel lists, etc. It composes with `server-member-roles` for admin-gated writes from your own UI; see the `app-settings-flat-values`, `app-settings-list-values`, `app-settings-per-context`, `ui-feature-by-role`, and `chat-trigger-respond` recipes.

## Source Files

| File | What it covers |
|------|---------------|
| [main.ts](src/main.ts) | Server entry point — wires `initializeGlobalSettings` into `rootServer.lifecycle.start` |
| [global-settings.ts](src/global-settings.ts) | Reading at startup and runtime, casting to leaf types, subscribing to update events, and using `ReadOnlyMemberGroup.isMember` for membership checks |

## SDK Methods

- `state.globalSettings` (on `RootBotStartState` / `RootAppStartState`) — read settings during `onStarting`, before any event fires. Same shape as `rootServer.globalSettings`.
- `rootServer.globalSettings` — read settings at runtime from any handler. Indexing returns a `GlobalSetting` union; cast to the leaf type your manifest declared.
- `state.globalSettings.on(GlobalSettingsEvent.Update, handler)` — subscribe to admin edits. Handler receives a `GlobalSettingsUpdateEvent` with both `previous` and `current` snapshots so you can diff exactly what changed.
- `ReadOnlyMemberGroup` — value type for `roleOrMember` settings. Exposes:
  - `userIds` — directly assigned user IDs
  - `communityRoleIds` — assigned role IDs
  - `memberUserIds` — effective membership (users + members of assigned roles)
  - `isMember({ userId })` — async effective-membership check; takes the `{ userId }` shape you typically already have from an event payload.

## Permissions

```json
{
  "permissions": {
    "channel": {
      "createMessage": true
    }
  }
}
```

`channel.createMessage` is only required by the `/server-global-settings` chat-command demo trigger. The `globalSettings` API itself requires no permissions.

## Notes

- **The manifest is the contract.** Indexing into `globalSettings` returns the union of every leaf type, but your code knows which leaf it declared — cast directly. Use `?.` chains to cover (a) no `settings` block in the manifest and (b) the admin hasn't configured the item yet.
- **`state.globalSettings` and `rootServer.globalSettings` are the same object** — the start state version exists so you can read settings inside `onStarting` before any event has fired. After startup, prefer `rootServer.globalSettings`.
- **Update events carry full snapshots, not deltas.** `event.previous` and `event.current` are both complete settings objects, so you can compute the diff yourself and react to specific keys.
- **`selectBehavior` controls the admin picker UI** for `roleOrMember` items: `"user"`, `"users"`, `"role"`, `"roles"`, or the most-common `"roleMultiAndUserMulti"`.
- **Setting types and platform status:** `roleOrMember` is implemented today. Other types (`text`, `number`, `checkbox`, `channel`, `channelGroup`, `select`, `timestamp`, `time`, `date`, `color`) are declared in the manifest schema but not all are wired up on the platform yet — check the manifest-global-settings doc page before relying on a type.
- **Apps vs bots.** All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`); only the import differs. This api sample is hosted in a bot for simplicity.
