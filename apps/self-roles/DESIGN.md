# self-roles — Design

This document is the behavior contract and implementation guide for the `self-roles` sample app.

The sample teaches a different SDK shape than [`leveling-leaderboard`](../leveling-leaderboard/DESIGN.MD) — member-driven mutations, role enumeration/assignment, KV-backed config — while reusing the same admin-gating, broadcast, and auto-save patterns. Where a pattern appears in both, this doc names it briefly and links to the `leveling-leaderboard` source instead of restating; that keeps the focus on what's unique here.

---

## Adapting this sample

### Copy verbatim

These files are domain-agnostic — drop them straight into a new app:

| File | Purpose |
|---|---|
| `server/src/lib/log.ts` | Structured log helper |
| `server/src/lib/retry.ts` | `withRetry()` wrapper for SDK calls |
| `server/src/lib/safeBroadcast.ts` | Logs-and-swallows broadcast failures so they don't propagate |
| `server/src/adminCheck.ts` | Admin gating against `globalSettings.general.admins` + community owner |
| `client/src/components/{ErrorBoundary,Loader,EmptyState,QueryError,Button,TextInput,Icon,AdminOnly,AutoSaveStatus,AppHeader}.tsx` | Generic UI primitives. Update import paths and the app title in `AppHeader`. |
| `client/src/lib/{retry,rootColorScheme,useDebouncedMutation}.ts` | Client-side retry, theme→`color-scheme` bridge, debounced auto-save hook |
| `client/src/styles/globals.css` | Root theme tokens + reset |
| `client/src/index.tsx` | React entrypoint (verbatim — only mounts `<App/>`) |

### Adapt

These files are shaped for self-roles' specific data, but the **shape** is the lesson:

| File | What to change |
|---|---|
| `server/src/pickerStore.ts` | Replace `PickerConfig` with your config type. Keep the cache + `readConfig` / `writeConfig` separation. |
| `server/src/communityRoleSync.ts` | Replace the two role events with whatever platform events your app's stored state needs to track (channel deletes, member leaves, etc.). The pattern — *subscribe → mutate stored state → emit a callback that triggers a broadcast* — generalizes. |
| `server/src/rolePickerService.ts` | Your RPCs. Keep `requireAdmin`, the broadcast helpers, the validation pass on writes. |
| `client/src/contexts/PickerContext.tsx` | Your client-side state container. Keep the load-on-mount + broadcast-subscription shape. |
| `client/src/views/{HomeView,Settings}.tsx` | Your views. Keep the auto-save wiring, the AdminOnly defence, the empty/loading/error states. |

### Replace

These are pure self-roles concerns — your domain replaces them entirely:

- `networking/src/role_picker_service.proto` (your proto)
- `client/src/components/RoleToggle.tsx` (your row component)
- `client/src/views/Settings.tsx`'s `GroupCard` and `RolePickerModal` (your editor)

---

## Implementation patterns

### Storage: KV vs SQLite

This sample uses `dataStore.appData` (the platform key-value store). `leveling-leaderboard` uses SQLite. The right choice depends on access pattern:

| Picker config | XP / awards |
|---|---|
| One small blob (~5 KB max) | Many rows (one per user, one per award) |
| Read on mount + on broadcast | Read on every eligible message |
| Written rarely (admin edits) | Written constantly (every award) |
| No queries — full read every time | Indexed queries for top-N + per-user rank |

KV is the right tool here. SQLite would be over-engineered: no indexes to define, no migrations to run, no atomic upserts under contention. Picking the leaner tool is itself a teaching point — agents copying samples sometimes default to SQLite because that's what the most-detailed sample uses.

### Storage shape vs wire shape

The KV blob (`PickerConfig`) stores only the data the admin authors:

```ts
{
  groups: [
    {
      groupId,         // server-minted GUID
      title,
      description,
      exclusive,
      roles: [{ roleId, descriptionOverride }, ...],
    },
    ...
  ]
}
```

We do **not** store role names or color hexes. Those come from `rootServer.community.communityRoles.list()` at response time, stitched into the wire `PickerRole` shape in `resolveGroups()`. Storing them would mean writing the KV back on every `CommunityRoleEdited` event — needless I/O, and a stale-data risk every time a write fails.

### Live-syncing picker config to platform-side role changes

`communityRoleSync.ts` subscribes to two community-role events:

- **`CommunityRoleDeleted`** — the role left the community. We cull it from any group it appears in. Groups that go empty as a result are removed entirely (an empty group is just a section header with nothing under it). After mutation, fire the `onPickerConfigChanged` callback so the service broadcasts `PickerConfigChanged` to all clients.
- **`CommunityRoleEdited`** — the role's name or color changed. We don't store either, so no KV write — but already-connected clients have stale text rendered. Cheap pre-filter: only emit a change when the edited role is actually in our picker. Otherwise an unrelated role rename would force every client to re-render the picker.

`CommunityRoleCreated` and `CommunityRoleMoved` don't affect us — a new role isn't in our picker until an admin adds it; the platform's role ordering is independent of our picker order.

### Exclusive groups: server-side enforcement

When `ToggleRole` adds a role to an exclusive group, the server first removes any siblings the caller already has from that group, **then** adds the requested role. The order matters: a fetch-mid-flight from another client should see "removes have happened, add hasn't yet" rather than the inverse.

The client doesn't enforce exclusivity. It could (radio-button rendering is a hint), but doing it client-side opens a race where two browsers exchange add-add-add states and the server has to cope anyway. Server-as-source-of-truth keeps the rule in one place.

### Toggle response: server returns the caller's full role list

`ToggleRole` responds with the caller's complete set of role IDs in the picker, after the change. The client replaces local state from this payload — same shape as `GetPicker.myRoleIds`.

This is deliberately not optimistic-update on the client. For an exclusive group, the server may flip multiple roles in one RPC (sibling removals + the requested add). Predicting that client-side would duplicate server logic. Pending+disabled rows during the round trip is honest about the latency and avoids the flip-flop UX an optimistic update would produce.

### Broadcasts

| Event | Audience | Payload |
|---|---|---|
| `PickerConfigChanged` | `"all"` | Full groups (resolved with names + colors). Fires on admin save, on role-deleted cull, on role-edited rename. |
| `AdminsChanged` | `"all"` | Empty signal — clients re-fetch `GetPicker` to refresh `amIAdmin`. Mirrors `leveling-leaderboard` exactly. |

The picker config IS the public view — every member needs the same payload to render their toggles. So `PickerConfigChanged` is `"all"`. Contrast with `leveling-leaderboard`'s `SettingsUpdated`, which is **admin-only** because its payload carried sensitive XP-eligible user/role IDs. The split is conditional on payload sensitivity, not on which RPC triggered the broadcast.

`AdminsChanged` is a public empty signal because computing the new `amIAdmin` requires reading `globalSettings`, which the client doesn't see directly — so the only way to refresh is a server round trip. Same rationale as `leveling-leaderboard`.

### Admin gating

`globalSettings.general.admins` is a `roleOrMember` setting in `root-manifest.json` configured by the community owner via Root's native Global Settings UI. Server reads the resolved `ReadOnlyMemberGroup` on each `isAdmin()` check; community owner is always implicitly an admin (defence in depth — if the owner ever clears themselves out of the admins selection, they can still recover).

`adminCheck.ts` is copied verbatim from `leveling-leaderboard` — same shape, same `onAdminsChanged` callback hook for emitting the public refresh signal.

### Auto-save

`Settings.tsx` calls `useDebouncedMutation` with `mutationFn: updateGroups`, debounced ~150ms. Every local edit invokes `mutate(localGroups)` — the hook coalesces rapid changes into one RPC after the typing settles. `AutoSaveStatus` (rendered in the header row) only shows chrome on error; successful saves are invisible. Same hook used in `leveling-leaderboard`'s tabs.

The local-vs-server reconciliation: when a server broadcast arrives and the user has no pending edits, local mirrors server. When edits are in flight, the broadcast is ignored — otherwise the user's typing would get clobbered by their own auto-save echoing back.

---

## State

| Piece | Location |
|---|---|
| Current view (`home` / `settings`) | `useState` in `App.tsx` |
| Picker config (groups + amIAdmin + caller's role IDs + limits) | `PickerContext` fed by `GetPicker` + `PickerConfigChanged` + `AdminsChanged` |
| Local working copy in admin Settings | `useState<PickerGroup[]>` in `Settings.tsx`. Mirrors the context's `groups` while the user has no pending edits; diverges during an edit session and reconciles on save success. |
| Pending toggle IDs in HomeView | `useState<Set<string>>` — disables the affected row during round trip. |

No query cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` cleanup.

### `amIAdmin` lifecycle

Returned on `GetPicker`; refreshed via a `reload()` call on every `AdminsChanged` broadcast. Controls gear visibility in `AppHeader` and guards the settings view in the shell. `AdminOnly` is a defence-in-depth wrapper inside `Settings` itself for the case where a user's `amIAdmin` flipped between render and the gear render.

---

## Permissions and roles

```json
{ "community": { "manageRoles": true } }
```

One app-level role:

| Role | Description |
|------|-------------|
| **App admin** | Can view and edit Settings (the picker config). Configured via Root's native Global Settings UI for this app (`general.admins`). The community owner is always an admin. |

**App admins can**: view picker, toggle their own roles, edit groups, add/remove roles from groups, reorder groups.

**Other members can**: view picker, toggle their own roles.

---

## Limits

Server is single source of truth. Shipped to the client via `GetPicker.limits` so input fields use the same maxLength as server validation.

| Limit | Value |
|---|---|
| Group title chars | 60 |
| Group description chars | 200 |
| Role description override chars | 200 |
| Max groups | 20 |
| Max roles per group | 50 |

Beyond these, the server validates structural rules (no duplicate role across groups, no duplicate group ID) and throws `INVALID_CONFIG` so the auto-save status pill can surface the message.

---

## Empty / error / loading states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` | `<EmptyState title="No roles available" body="Your community admin hasn't published any self-assignable roles yet." />` | `<QueryError onRetry />` that calls `reload()` |
| Settings | `<Loader />` | "No groups yet." in the empty section | `<QueryError onRetry />` |
| RolePickerModal (admin "add role") | `<Loader />` inside the modal | "No more roles available — every assignable role is already in the picker." | `<QueryError onRetry />` inside the modal |

Toggle-time errors render inline as a banner above the groups, not as a full-view error — the picker UI still works for other roles.

---

## Out of scope (mirrors README)

- Reaction-based picker
- Time-bound roles
- Request/approval workflow
- Per-channel pickers
- Primary-role assignment
- Per-role member counts

For the reaction-event SDK pattern specifically, see `api-samples/server-reactions`.
