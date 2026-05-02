---
kind: recipe
category: ui
question: How do I gate UI features by role and enforce the same gate server-side on privileged actions?
composes:
  - client-app-users
  - server-roles
  - server-member-roles
  - server-global-settings
  - networking-app-services
exemplified_by: leveling-leaderboard
---

# Recipe: UI Feature Gating by Role

> *"How do I enable/disable UI features based on the current user's roles?"*

Render different UI sections to different users — e.g., everyone sees the member view, moderators see an extra panel, the owner sees admin controls. Then on top of that, when a moderator clicks an action button, the server independently re-checks their role and rejects the call if they aren't authorized — defence in depth so the feature is safe even when the UI is bypassed.

The configured role is admin-controlled via a `roleOrMember` setting in `root-manifest.json`.

## TL;DR

The server reads `general.moderatorRole` from `globalSettings` (a `roleOrMember` picker), checks whether the caller is in that group, and returns boolean flags. The client renders sections conditionally on those flags. When settings change or someone's role membership changes, the server fires a `RolesChanged` broadcast — clients re-fetch their context and re-render.

Moderator-only **actions** are gated independently. The recipe's `getModeratorReport` RPC re-runs the same role check server-side and throws `RootServerException(ViewerError.NOT_MODERATOR)` for unauthorized callers. The client matches `err.code` to render a friendly message instead of a generic failure.

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

## ⚠️ UI gating is for visibility, not security

**The UI gating in this recipe is for VISIBILITY ONLY.** A determined user can edit the DOM, intercept network traffic, or call the service client directly to bypass the visual gate. The button being hidden is UX — it tells well-intentioned users which actions aren't theirs. It is not a security boundary.

The security boundary is the **server-side check on every privileged RPC**. This recipe demonstrates both layers: the client hides the "View moderator report" button for non-moderators (UX), and the server independently rejects the call with `RootServerException(NOT_MODERATOR)` if a non-moderator manages to invoke it anyway (security). Both layers are part of the same lesson — never ship one without the other.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-global-settings`](../../api-samples/server-global-settings) | The `globalSettings` manifest schema and runtime read | Declare the `roleOrMember` picker; read it server-side per request |
| [`api-samples/server-member-roles`](../../api-samples/server-member-roles) | List/add/remove a member's roles | Indirectly, via `ReadOnlyMemberGroup.isMember()` which the platform resolves from the picker |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services with broadcasts and typed errors | The `ViewerService` RPC + `RolesChanged` broadcast + `ViewerError.NOT_MODERATOR` rejection |
| [`api-samples/client-app-users`](../../api-samples/client-app-users) | Read the authenticated user on the client | Implicit — `client.userId` is provided to the server handler by the framework |

## Walkthrough

### 1. Manifest declares the role picker

[`root-manifest.json`](root-manifest.json) — one `roleOrMember` setting under `general.moderatorRole`. The community admin selects which existing community role(s) and/or specific users count as "moderators" for this app.

The owner is **not** declared here — owners are detected separately on the server (see step 3) so misconfiguration can't lock them out.

### 2. Proto declares the contract

[`networking/src/viewer_service.proto`](networking/src/viewer_service.proto) — three things:

- `GetViewerContext` returns `{ userId, isModerator, isOwner }` — the informational query the client uses to gate UI visibility.
- `GetModeratorReport` returns `{ data }` — a moderator-only action. Non-moderator callers receive a typed error instead of a response.
- `RolesChangedEvent` is the broadcast for cache invalidation. Empty payload — it's a "go ask again" signal, not a delta.
- `ViewerError` enum declares the recipe's typed-error codes. `NOT_MODERATOR = 1` is what the server throws for unauthorized callers; the client matches `err.code === ViewerError.NOT_MODERATOR` to render a friendly message.

The empty broadcast is a deliberate choice. We could send each user's new flags directly, but (a) flags are 3 booleans — already tiny, (b) targeted broadcasts to disconnected clients drop silently, and (c) a re-fetch on receipt is naturally per-user-correct because the server response is computed against `client.userId`. The "all"-audience-with-client-filter pattern is canonical for this shape; see leveling-leaderboard's `MemberXpChanged` for the same idiom.

Recipe-defined error enums use **positive values only** — negative values are reserved for built-in SDK errors. Each recipe owns its own error vocabulary; the platform doesn't impose a shared error namespace.

### 3. Server computes flags + enforces the action

[`server/src/viewer-service.ts`](server/src/viewer-service.ts) has two methods, both pivoting on the same role check:

**`getViewerContext`** — the informational query:

1. **Owner check first.** `community.ownerUserId === client.userId`. The owner is implicitly elevated regardless of the moderator setting — defence in depth, so misconfiguring the picker can't lock the owner out.
2. **Moderator check.** Read the `roleOrMember` picker from `rootServer.globalSettings`; the platform has resolved it to a `ReadOnlyMemberGroup` whose `.isMember({ userId })` does the membership check. No need to walk the role list manually.

Returns the flags. Re-reads on every request. The picker can change at any time, and reading is cheap (the platform pre-resolves).

**`getModeratorReport`** — the privileged action. Same role check, but the failure path throws a typed error:

```typescript
if (!isOwner && !isModerator) {
  throw new RootServerException(ViewerError.NOT_MODERATOR, "Moderator-only action");
}
```

The check is duplicated rather than extracted into a shared helper, so the recipe reads top-to-bottom. In real apps with many privileged RPCs you'd factor it into a `requireModerator(client)` helper that throws on failure (leveling-leaderboard's `requireAdmin` is the canonical shape). The duplication here is a teaching choice, not a recommendation.

### 4. Server broadcasts on relevant changes

[`server/src/main.ts`](server/src/main.ts) wires two event sources to the same broadcast:

- `globalSettings.on("update")` — the picker may have moved, so flags are stale
- `communityMemberRoles.on(Created/Deleted)` — someone's role membership changed; we don't know who without inspecting the event, so we ask everyone to re-fetch. Cheap — the response is 3 booleans.

Two fork-time optimizations once you have many connected clients: (a) inspect the event payload and broadcast to only the affected user, instead of fanning out to "all"; (b) coalesce/debounce — a bulk role assignment fires N `Created` events in close succession, currently producing N broadcasts that all tell every client the same thing. A 100ms debounce collapses the storm into a single "go ask again" signal. Neither is worth the complexity at typical community size.

### 5. Client fetches + subscribes + handles the typed error

[`client/src/App.tsx`](client/src/App.tsx) does two things on mount:

1. Calls `viewerServiceClient.getViewerContext({})` to get initial flags
2. Subscribes to `RolesChanged` via `viewerServiceClient.on(...)`. The handler re-runs the fetch.

Cleanup on unmount unsubscribes (`viewerServiceClient.off`) and sets a `cancelled` flag so an in-flight fetch can't clobber state after the component is gone.

The render is plain conditional JSX:

```tsx
{(ctx.isModerator || ctx.isOwner) && (
  <Section title="Moderator panel">
    <ModeratorReportButton />
  </Section>
)}
{ctx.isOwner && <Section title="Owner controls">…</Section>}
```

`isOwner` is OR'd into the moderator condition because the owner is always elevated.

The `ModeratorReportButton` calls `viewerServiceClient.getModeratorReport({})` and wraps the call in a try/catch:

```tsx
try {
  const r = await viewerServiceClient.getModeratorReport({});
  setData(r.data);
} catch (err) {
  if (err instanceof RootServerException && err.code === ViewerError.NOT_MODERATOR) {
    setError("You're no longer authorized to view the report.");
  } else {
    setError(err instanceof Error ? err.message : String(err));
  }
}
```

Match on `err.code` rather than `err.message` — the message is freeform and may change, but the numeric code from the proto enum is stable across versions and keeps client and server in sync without coordinating strings.

## Does NOT cover

| Concern | Lives in |
|---|---|
| **Reading raw role IDs** for a user (advanced cases that need to inspect the role list directly) | [`api-samples/server-member-roles`](../../api-samples/server-member-roles) |
| **Role mutation** (assigning/removing roles programmatically) | [`api-samples/server-member-roles`](../../api-samples/server-member-roles) |
| **Mounting/unmounting subscriptions cleanly** in larger components (e.g., scoped per route) | A general client-lifecycle concern with its own composition. |
| **Per-user targeted broadcasts** instead of `"all"` audience | Larger-scale optimization; out of recipe scope. See leveling-leaderboard's broadcast section for the tradeoff narration. |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-ui-feature-by-role` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service — Node-side test code can't directly invoke gen-client RPCs across the SDK boundary.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> The test driver synthesises `Client` objects and dispatches by method name (`/test-ui-feature-by-role <method> <userIds>`), so the harness can exercise both `getViewerContext` and `getModeratorReport`. Failures are reported per-user as `✗ error_code=<n>` lines matching the recipe's proto error enum. Production recipes should never expose a self-test command.

