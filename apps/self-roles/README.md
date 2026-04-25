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
  "community": { "manageRoles": true }
}
```

`community.manageRoles` is the only permission required — the bot needs it to call `communityMemberRoles.add` and `.remove`. No `fullControl`, no channel access, no message events.

## Known limits

- **No reconnect-driven catch-up.** Same as `leveling-leaderboard`. The client SDK doesn't currently surface a reconnect event; broadcasts that fire during a brief outage are lost. Wire `PickerProvider.reload()` to a reconnect hook when one exists.
- **Cross-process settings cache coherence.** The in-memory picker cache is correct for a single-process app server. Replace with a per-call DB read or a small pub/sub if scaling horizontally.
- **Last-writer-wins on concurrent admin edits.** Two admins editing groups in parallel see last-save-wins. Acceptable for a config edited by a handful of people; a fork that needs finer concurrency would split `UpdateGroups` into smaller patch RPCs (`MoveRole`, `RenameGroup`, etc.) and merge server-side.
- **Bot manageability isn't pre-filtered.** `GetAssignableRoles` returns all non-everyone community roles; the SDK doesn't expose a clean "is-this-role-assignable-by-me?" predicate. Roles the bot can't actually assign at runtime fail with `ROLE_NOT_ASSIGNABLE` on `ToggleRole`; admin sees the error and removes the role from the picker.

Use this sample as a shape reference for member-driven self-service, KV-backed config, role enumeration/assignment, and exclusive-group enforcement. Pair with `leveling-leaderboard` for the admin-driven mutation patterns and SQLite-backed aggregation. Reuse the lib helpers (`adminCheck`, `safeBroadcast`, `useDebouncedMutation`) verbatim where they fit.
