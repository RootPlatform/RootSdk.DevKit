# Recipe: UI Feature Gating by Role

> *"How do I enable/disable UI features based on the current user's roles?"*

Render different UI sections to different users — e.g., everyone sees the member view, moderators see an extra panel, the owner sees admin controls. The configured role is admin-controlled via a `roleOrMember` setting in `root-manifest.json`.

## TL;DR

The server reads `general.moderatorRole` from `globalSettings` (a `roleOrMember` picker), checks whether the caller is in that group, and returns boolean flags. The client renders sections conditionally on those flags. When settings change or someone's role membership changes, the server fires a `RolesChanged` broadcast — clients re-fetch their context and re-render.

```
Client                                          Server
──────                                          ──────
mount → getViewerContext() ───────────────────► reads globalSettings.general.moderatorRole
                                                checks roleGroup.isMember(client.userId)
                                                checks community.ownerUserId === client.userId
       ◄────────────── { userId, isModerator, isOwner }
render gated UI

settings update OR role membership change ────► onSettingsChanged / onRoleMembershipChanged
                                                broadcastRolesChanged({}, "all")
       ◄──────── RolesChanged (empty payload, "go ask again")
re-fetch → re-render
```

## ⚠️ Scope: visibility only, not access control

**This recipe gates UI visibility ONLY.** A determined user can edit the DOM, intercept network traffic, or call the service client directly to bypass the UI. Any action that *requires* elevated privileges must ALSO be enforced server-side.

For the full client-gating + server-enforcement story, see **recipe #20: "How do I gate a client action behind a permission AND enforce it server-side?"** This recipe is recipe #20's visibility half — useful on its own (you don't always want to show what users can't do), and a foundation for #20.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-global-settings`](../../api-samples/server-global-settings) | The `globalSettings` manifest schema and runtime read | Declare the `roleOrMember` picker; read it server-side per request |
| [`api-samples/server-member-roles`](../../api-samples/server-member-roles) | List/add/remove a member's roles | Indirectly, via `ReadOnlyMemberGroup.isMember()` which the platform resolves from the picker |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services with broadcasts and error handling | The `ViewerService` RPC + `RolesChanged` broadcast plumbing |
| [`api-samples/client-app-users`](../../api-samples/client-app-users) | Read the authenticated user on the client | Implicit — `client.userId` is provided to the server handler by the framework |

## Walkthrough

### 1. Manifest declares the role picker

[`root-manifest.json`](root-manifest.json) — one `roleOrMember` setting under `general.moderatorRole`. The community admin selects which existing community role(s) and/or specific users count as "moderators" for this app.

The owner is **not** declared here — owners are detected separately on the server (see step 3) so misconfiguration can't lock them out.

### 2. Proto declares the contract

[`networking/src/viewer_service.proto`](networking/src/viewer_service.proto) — `GetViewerContext` returns `{ userId, isModerator, isOwner }`; `BroadcastRolesChanged` has an empty payload (it's a "go ask again" signal, not a delta).

The empty broadcast is a deliberate choice. We could send each user's new flags directly, but (a) flags are 3 booleans — already tiny, (b) targeted broadcasts to disconnected clients drop silently, and (c) a re-fetch on receipt is naturally per-user-correct because the server response is computed against `client.userId`. The "all"-audience-with-client-filter pattern is canonical for this shape; see leveling-leaderboard's `MemberXpChanged` for the same idiom.

### 3. Server computes the flags

[`server/src/viewer-service.ts`](server/src/viewer-service.ts) — the `ViewerService` RPC handler:

1. **Owner check first.** `community.ownerUserId === client.userId`. The owner is implicitly elevated regardless of the moderator setting — defence in depth, so misconfiguring the picker can't lock the owner out.
2. **Moderator check.** Read the `roleOrMember` picker from `rootServer.globalSettings`; the platform has resolved it to a `ReadOnlyMemberGroup` whose `.isMember({ userId })` does the membership check. No need to walk the role list manually.

Re-reads on every request. The picker can change at any time, and reading is cheap (the platform pre-resolves).

### 4. Server broadcasts on relevant changes

[`server/src/main.ts`](server/src/main.ts) wires two event sources to the same broadcast:

- `globalSettings.on("update")` — the picker may have moved, so flags are stale
- `communityMemberRoles.on(Created/Deleted)` — someone's role membership changed; we don't know who without inspecting the event, so we ask everyone to re-fetch. Cheap — the response is 3 booleans.

A more targeted version would inspect the event payload and broadcast to only the affected user. That's a fork-time optimization once you have many connected clients; for the typical community size it's not worth the complexity.

### 5. Client fetches + subscribes

[`client/src/App.tsx`](client/src/App.tsx) does two things on mount:

1. Calls `viewerServiceClient.getViewerContext({})` to get initial flags
2. Subscribes to `RolesChanged` via `viewerServiceClient.on(...)`. The handler re-runs the fetch.

Cleanup on unmount unsubscribes (`viewerServiceClient.off`) and sets a `cancelled` flag so an in-flight fetch can't clobber state after the component is gone.

The render is plain conditional JSX:

```tsx
{(ctx.isModerator || ctx.isOwner) && <Section title="Moderator panel">…</Section>}
{ctx.isOwner && <Section title="Owner controls">…</Section>}
```

`isOwner` is OR'd into the moderator condition because the owner is always elevated.

## Does NOT cover

| Concern | Lives in |
|---|---|
| Server-side **enforcement** of role-gated actions | Recipe #20 (gate a client action behind a permission AND enforce it server-side). This recipe is the *visibility* half. |
| **Reading raw role IDs** for a user (advanced cases that need to inspect the role list directly) | [`api-samples/server-member-roles`](../../api-samples/server-member-roles) |
| **Role mutation** (assigning/removing roles programmatically) | [`api-samples/server-member-roles`](../../api-samples/server-member-roles) |
| **Mounting/unmounting subscriptions cleanly** in larger components (e.g., scoped per route) | Recipe #46 (subscribe to server events only while a component is mounted) |
| **Per-user targeted broadcasts** instead of `"all"` audience | Larger-scale optimization; out of recipe scope. See leveling-leaderboard's broadcast section for the tradeoff narration. |

## Cross-tier links

- **Sibling recipes:** #20 (gate a client action behind permission AND enforce server-side) — recipe #19's natural successor.
- **Exemplar apps:** [`apps/leveling-leaderboard`](../../apps/leveling-leaderboard) — uses the same `globalSettings.general.admins` + `ReadOnlyMemberGroup.isMember()` pattern with an `am_i_admin` flag in its `GetLeaderboard` response. Production-grade scale-up of this recipe.

## Build and run

```bash
# From this directory
npm install
npm run build       # builds networking → server → client

# Then in two terminals (set DEV_TOKEN in server/.env first):
cd server && npm run server      # devhost
cd client && npm run client      # vite
```

See the [DevKit root README](../../README.md) for environment setup (`.npmrc`, `DEV_TOKEN`).

## Test

Lives at [`Code/Ops.Testing/test-devkit/test-recipes/`](../../../Ops.Testing/test-devkit/test-recipes) (alongside `test-api-samples`). The test installs the recipe, configures a moderator role, assigns a test user to it, calls `GetViewerContext` as that user, and asserts the returned flags. Repeats the assertion as the owner and as a non-moderator member.
