# self-roles

Members open the app and click toggles to add or remove "self-assignable" community roles from themselves (region, pronouns, notification opt-ins, color roles). Admins curate which roles are exposed and how they're grouped via an in-app Settings view. Full behavior contract and implementation patterns in [DESIGN.md](DESIGN.md).

> **Looking for "reaction roles"?** This is the Root-idiomatic equivalent — click-to-toggle in the app, not reactions on a chat message. The pattern is cleaner in Root because Root has rich apps (Discord pushed the same UX into bots only because it didn't). If you specifically want the reaction-event SDK surface, see [`api-samples/server-reactions`](../../api-samples/server-reactions).

## Coverage scope

**Demonstrates:**
- **Member-driven mutations.** Every mutation in `leveling-leaderboard` is admin-only; this sample's primary flow is the inverse — non-admin members modifying their own role state via `ToggleRole`. Admin auth lives only on the curation surface (`UpdateGroups`, `GetAssignableRoles`).
- **Role enumeration + assignment SDK surface.** Whole new platform area not covered by `leveling-leaderboard`: `rootServer.community.communityRoles.list()` for the assignable-role universe, `communityMemberRoles.add` / `.remove` / `.list` for per-user mutations.
- **KV-backed config (no SQLite).** Picker config is one small JSON blob, written rarely, no queries — exactly the case `dataStore.appData` is designed for. Compare `leveling-leaderboard`, which uses SQLite because it needs indexed top-N and rank queries. The right tool depends on the access pattern.
- **Reacting to platform-side state changes.** Subscribing to `CommunityRoleDeleted` to cull deleted roles from the picker config, and to `CommunityRoleEdited` to re-broadcast so connected clients re-render with fresh names. App state must stay consistent with platform state — this is the general pattern.
- **Exclusive-group server-side enforcement.** Toggling a role in an exclusive group atomically removes its siblings before adding the new role. Generalises to any "radio-button-style choice" feature.
- **Public broadcast (vs admin-only).** `PickerConfigChanged` ships the full config to `"all"` because the picker config IS the public view. Inverse of `leveling-leaderboard`'s `SettingsUpdated` (admin-only because its payload carried sensitive user/role IDs). Same SDK primitives, different audience — the split is conditional on payload sensitivity.
- **Reused patterns.** Admin gating via `globalSettings.general.admins`, debounced auto-save in admin Settings, push-view shell with gear-icon header, ErrorBoundary + ReportClientError telemetry funnel, Root theme tokens. All copied from `leveling-leaderboard` to reinforce the shapes.

**Does NOT demonstrate:**
- Reaction-based picker (different UX; not Root-idiomatic — see api-sample link above).
- Time-bound roles (auto-expire after N hours).
- Request/approval workflow ("request role → admin approves").
- Per-channel pickers (community-wide only).
- Primary-role assignment (admin-only; Root's native Settings UI handles this directly — apps shouldn't wrap native admin tooling).
- Member counts on roles (the SDK doesn't expose a clean per-role count without enumerating membership; not worth the cost for this sample).

## Permissions

```json
{
  "community": { "fullControl": true }
}
```

`fullControl` looks heavy, but it's the right declaration for this sample. Root enforces a **subset-of-permissions** check on every role assignment: an app can only assign a role whose permissions are a subset of the app's own. Since this sample's picker is admin-curated and can contain arbitrary community roles (each carrying its own community + channel permissions), the manifest has to declare a superset large enough that any plausible role passes the check. `fullControl` is the only practical declaration that satisfies that for *any* picker contents.

A fork that knows in advance which roles will be in the picker can narrow the manifest to a tighter superset and constrain the admin's role-add picker accordingly. That's a meaningfully different sample (admin role-curation gated by manifest scope) and probably belongs as a separate api-sample if you want to teach it.

## Known limits

- **No reconnect-driven catch-up.** Same as `leveling-leaderboard`. The client SDK doesn't currently surface a reconnect event; broadcasts that fire during a brief outage are lost. Wire `PickerProvider.reload()` to a reconnect hook when one exists.
- **Cross-process settings cache coherence.** The in-memory picker cache is correct for a single-process app server. Replace with a per-call DB read or a small pub/sub if scaling horizontally.
- **Last-writer-wins on concurrent admin edits.** Two admins editing groups in parallel see last-save-wins. Acceptable for a config edited by a handful of people; a fork that needs finer concurrency would split `UpdateGroups` into smaller patch RPCs (`MoveRole`, `RenameGroup`, etc.) and merge server-side.
- **No pre-flight subset check on `GetAssignableRoles`.** Root only lets an app assign a role whose permissions are a subset of the app's own (see Permissions above). The SDK doesn't expose a "is-this-role-a-subset-of-mine?" predicate the picker can call up-front, so we surface the constraint at toggle time via `ROLE_NOT_ASSIGNABLE`. With `fullControl` declared this is rare — you'd hit it only if Root's permission model gains a permission the app doesn't have. A fork using a narrower manifest would hit it more often and would want its own pre-flight check (compute the role's permissions vs the manifest's at admin role-add time).
- **`myRoleIds` staleness on `PickerConfigChanged`.** The broadcast carries the new picker config but not a per-recipient role-membership update. If an admin adds a role to the picker that the member already holds (assigned outside this app via Root's native role UI), the toggle renders OFF until the next full refresh — the member's actual role state is correct on the server, the local view just hasn't caught up. Two fork paths if this matters: (a) targeted broadcast that includes a fresh `my_role_ids` per recipient; or (b) trigger a `softReload()` from the broadcast handler at the cost of one extra round trip per config change. Left as documented behavior here so the broadcast stays a single public event.

Use this sample as a shape reference for member-driven self-service, KV-backed config, role enumeration/assignment, and exclusive-group enforcement. Pair with `leveling-leaderboard` for the admin-driven mutation patterns and SQLite-backed aggregation. Reuse the lib helpers (`adminCheck`, `safeBroadcast`, `useDebouncedMutation`) verbatim where they fit. See [`apps/README.md`](../README.md) for the full sample-app catalog.
