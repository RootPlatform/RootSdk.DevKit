---
kind: sample-app
description: Member-driven self-assignable role picker (Discord "reaction-roles" equivalent)
complexity: complex
key_patterns:
  - member-driven mutations
  - role enumeration + assignment
  - KV-backed config
  - "`CommunityRoleDeleted/Edited` subscriptions"
  - exclusive-group server-side enforcement
  - public broadcast (vs admin-only)
permissions:
  - community.fullControl
---

# self-roles

Members open the app and click toggles to add or remove "self-assignable" community roles from themselves (region, pronouns, notification opt-ins, color roles). Admins curate which roles are exposed and how they're grouped via an in-app Settings view.

> **Looking for "reaction roles"?** This is the Root-idiomatic equivalent — click-to-toggle in the app, not reactions on a chat message. The pattern is cleaner in Root because Root has rich apps (Discord pushed the same UX into bots only because it didn't). If you specifically want the reaction-event SDK surface, see [`api-samples/server-reactions`](../../api-samples/server-reactions).

This sample teaches a different SDK shape than [`leveling-leaderboard`](../leveling-leaderboard/) — member-driven mutations, role enumeration/assignment, KV-backed config — while reusing the same admin-gating, broadcast, and auto-save patterns. Where a pattern appears in both, this doc names it briefly and links to the `leveling-leaderboard` source instead of restating; that keeps the focus on what's unique here.

> **Standard Root app fork procedure and shared lib helpers** are in [../AGENTS.md](../AGENTS.md). What follows is specific to forking *this* sample.

## Demonstrates

- **Member-driven mutations.** Every mutation in `leveling-leaderboard` is admin-only; this sample's primary flow is the inverse — non-admin members modifying their own role state via `ToggleRole`. Admin auth lives only on the curation surface (`UpdateGroups`, `GetAssignableRoles`).
- **Role enumeration + assignment SDK surface.** Whole new platform area not covered by `leveling-leaderboard`: `rootServer.community.communityRoles.list()` for the assignable-role universe, `communityMemberRoles.add` / `.remove` / `.list` for per-user mutations.
- **KV-backed config (no SQLite).** Picker config is one small JSON blob, written rarely, no queries — exactly the case `dataStore.appData` is designed for. Compare `leveling-leaderboard`, which uses SQLite because it needs indexed top-N and rank queries. The right tool depends on the access pattern.
- **Reacting to platform-side state changes.** Subscribing to `CommunityRoleDeleted` to cull deleted roles from the picker config, and to `CommunityRoleEdited` to re-broadcast so connected clients re-render with fresh names. App state must stay consistent with platform state — this is the general pattern.
- **Exclusive-group server-side enforcement.** Toggling a role in an exclusive group atomically removes its siblings before adding the new role. Generalises to any "radio-button-style choice" feature.
- **Public broadcast (vs admin-only).** `PickerConfigChanged` ships the full config to `"all"` because the picker config IS the public view. Inverse of `leveling-leaderboard`'s `SettingsUpdated` (admin-only because its payload carried sensitive user/role IDs). Same SDK primitives, different audience — the split is conditional on payload sensitivity.
- **Reused patterns.** Admin gating via `globalSettings.general.admins`, debounced auto-save in admin Settings, push-view shell with gear-icon header, ErrorBoundary + ReportClientError telemetry funnel, Root theme tokens. All copied from `leveling-leaderboard` to reinforce the shapes.

## Does NOT demonstrate

- Reaction-based picker (different UX; not Root-idiomatic — see [`api-samples/server-reactions`](../../api-samples/server-reactions)).
- Time-bound roles (auto-expire after N hours).
- Request/approval workflow ("request role → admin approves").
- Per-channel pickers (community-wide only).
- Primary-role assignment (admin-only; Root's native Settings UI handles this directly — apps shouldn't wrap native admin tooling).
- Member counts on roles (the SDK doesn't expose a clean per-role count without enumerating membership; not worth the cost for this sample).

## Adapt — sample-specific shapes

These files are shaped for self-roles' specific data, but the **shape** is the lesson. Each row teaches a generalized pattern that transfers to apps with similar shape:

| File | What to change |
|---|---|
| `server/src/pickerStore.ts` | Replace `PickerConfig` with your config type. Keep the cache + `readConfig` / `writeConfig` separation. |
| `server/src/communityRoleSync.ts` | Replace the two role events with whatever platform events your app's stored state needs to track (channel deletes, member leaves, etc.). The pattern — *subscribe → mutate stored state → emit a callback that triggers a broadcast* — generalizes. |
| `server/src/rolePickerService.ts` | Your RPCs. Keep `requireAdmin`, the broadcast helpers, the validation pass on writes. |
| `client/src/contexts/PickerContext.tsx` | Your client-side state container. Keep the load-on-mount + broadcast-subscription shape. |
| `client/src/views/{HomeView,Settings}.tsx` | Your views. Keep the auto-save wiring, the AdminOnly defence, the empty/loading/error states. |

## Replace — pure self-roles concerns

These are domain-specific to self-roles — your fork replaces them entirely:

- `networking/src/role_picker_service.proto` (your proto)
- `client/src/components/RoleToggle.tsx` (your row component)
- `client/src/views/Settings.tsx`'s `GroupCard` and `RolePickerModal` (your editor)

## Sample-specific fork notes

Beyond the [standard fork procedure](../AGENTS.md#standard-root-app-fork-procedure):

- **Step 3 (manifest):** the sample declares `community.fullControl` because picker contents are admin-curated at runtime (see [Why `fullControl`](#why-fullcontrol) below). A fork that knows its picker's role set up front can narrow this; see [Forks with tighter scope](#forks-with-tighter-scope).
- **Step 4 (proto):** keep the public-broadcast-when-payload-is-public-view pattern — `PickerConfigChanged` ships to `"all"` because every member needs the same config to render their toggles.
- **Step 5 (server-side):** rewire `communityRoleSync.ts` to subscribe to whichever platform events your stored state needs to track. Keep the *subscribe → mutate stored state → emit callback that triggers broadcast* pattern. Keep server-side enforcement of any "exclusive group"-style invariants — don't push exclusivity to the client.
- **Step 6 (client):** keep the toggle-response-returns-full-state pattern — no client-side optimistic updates for multi-row server mutations.
- **Step 8 (verify invariants):** verify the platform-state-consistency invariant holds in your domain. Every platform event your app stores derived state for should have a defense (cull on delete, re-broadcast on edit, cheap pre-filter to avoid pointless writes). Run the server through one full cycle (admin curates → broadcast lands → platform-side delete → cull picks up → re-broadcast → connected clients re-render) before considering the fork complete.

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

- **`CommunityRoleDeleted`** — the role left the community. We cull it from any group it appears in. Groups that become empty as a result are **preserved** in the stored config, not deleted — the admin authored that group with a title, and silently dropping it on a delete event would erase intent. The HomeView filters empty groups at render time so members don't see useless section headers; the admin editor still shows them so the admin can either repopulate or explicitly delete. After mutation, fire the `onPickerConfigChanged` callback so the service broadcasts `PickerConfigChanged` to all clients.
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

## Permissions and roles

```json
{ "community": { "fullControl": true } }
```

### Why `fullControl`

Root's role-assignment model is **permission subset**, not rank or hierarchy. From the API docs: *"Your code can only assign roles whose permissions are a subset of its own."* The SDK throws `NoPermissionToAdd` (1001) if any permission on the target role isn't also on the app.

For a generic self-roles app whose picker contents are admin-curated at runtime, the manifest can't predict which permissions any given role will carry. Most community roles carry at least channel-level basics (`createMessage`, `viewMessageHistory`, etc.) so the assigning app needs those declared too. The cleanest universal declaration is `community.fullControl: true`, which (per the manifest docs) "grants every community permission and bypasses all channel-specific permissions" — making the subset check trivially true for any role.

### Forks with tighter scope

A production fork that knows its picker's role set ahead of time can declare a narrower superset. Two reasonable shapes:

1. **Manifest-scoped picker.** Manifest declares only the permissions the curated roles actually need (e.g. `community.manageRoles` + `channel.createMessage`). Admin role-add picker filters out roles that carry permissions outside the manifest. Members never see "can't be assigned" because impossible-to-assign roles never reach the picker.

2. **Per-role permission diff at admin-add time.** Manifest stays narrow; admin picker shows every role; when an admin selects a role, server checks the role's permissions against the manifest's and either accepts or refuses with a clear "your manifest doesn't grant <X>" message.

Both are real patterns. Neither is the right shape for *this* sample because they're meaningfully more complex and shift the focus away from self-roles toward permission gymnastics. Captured as fork-options.

### Roles

One app-level role:

| Role | Description |
|------|-------------|
| **App admin** | Can view and edit Settings (the picker config). Configured via Root's native Global Settings UI for this app (`general.admins`). The community owner is always an admin. |

**App admins can**: view picker, toggle their own roles, edit groups, add/remove roles from groups, reorder groups.

**Other members can**: view picker, toggle their own roles.

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

## Empty / error / loading states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` | `<EmptyState title="No roles available" body="Your community admin hasn't published any self-assignable roles yet." />` | `<QueryError onRetry />` that calls `reload()` |
| Settings | `<Loader />` | "No groups yet." in the empty section | `<QueryError onRetry />` |
| RolePickerModal (admin "add role") | `<Loader />` inside the modal | "No more roles available — every assignable role is already in the picker." | `<QueryError onRetry />` inside the modal |

Toggle-time errors render inline as a banner above the groups, not as a full-view error — the picker UI still works for other roles.

## Known production limits

A few production concerns are intentionally not addressed here. They depend on capabilities the SDK doesn't currently expose to apps, on infrastructure choices that vary per deployment, or on product-level decisions a fork should revisit.

- **No reconnect-driven catch-up.** Same as `leveling-leaderboard`. The client SDK doesn't currently surface a reconnect event; broadcasts that fire during a brief outage are lost. Wire `PickerProvider.reload()` to a reconnect hook when one exists.
- **Cross-process settings cache coherence.** The in-memory picker cache is correct for a single-process app server. Replace with a per-call DB read or a small pub/sub if scaling horizontally.
- **Last-writer-wins on concurrent admin edits.** Two admins editing groups in parallel see last-save-wins. Acceptable for a config edited by a handful of people; a fork that needs finer concurrency would split `UpdateGroups` into smaller patch RPCs (`MoveRole`, `RenameGroup`, etc.) and merge server-side.
- **No pre-flight subset check on `GetAssignableRoles`.** Root only lets an app assign a role whose permissions are a subset of the app's own (see [Why `fullControl`](#why-fullcontrol) above). The SDK doesn't expose a "is-this-role-a-subset-of-mine?" predicate the picker can call up-front, so we surface the constraint at toggle time via `ROLE_NOT_ASSIGNABLE`. With `fullControl` declared this is rare — you'd hit it only if Root's permission model gains a permission the app doesn't have. A fork using a narrower manifest would hit it more often and would want its own pre-flight check (compute the role's permissions vs the manifest's at admin role-add time).
- **`myRoleIds` staleness on `PickerConfigChanged`.** The broadcast carries the new picker config but not a per-recipient role-membership update. If an admin adds a role to the picker that the member already holds (assigned outside this app via Root's native role UI), the toggle renders OFF until the next full refresh — the member's actual role state is correct on the server, the local view just hasn't caught up. Two fork paths if this matters: (a) targeted broadcast that includes a fresh `my_role_ids` per recipient; or (b) trigger a `softReload()` from the broadcast handler at the cost of one extra round trip per config change. Left as documented behavior here so the broadcast stays a single public event.
