---
kind: recipe
category: app-settings
question: How do I let app admins tune flat config values at runtime via an in-app Settings page, persisted in KV with admin-gated writes?
composes:
  - server-key-value-store
  - server-global-settings
  - server-member-roles
  - networking-app-services
exemplified_by: leveling-leaderboard
---

# Recipe: App Settings (Flat Values)

> *"How do I let app admins tune flat config values at runtime via an in-app Settings page, with the values persisted in KV and read efficiently by the rest of the app?"*

> ⚠️ **App-only recipe.** Bots have no UI surface and configure exclusively through `globalSettings`. See the bot configuration explanation for that path.

A KV-backed store of three example settings (text, number, checkbox), a Settings form gated by an admin role, partial updates, and a broadcast that drives client re-fetches when values change.

## Two-step decision: where do my settings live?

Before writing any code, decide:

**Step 1 — Who configures this?**

| Configurer | Storage | When |
|---|---|---|
| Community admins, at install or via the platform's Settings UI | `globalSettings` (declared in `root-manifest.json`) | The choice belongs to the community admin. Bots can only do this. |
| App admins, at runtime, via your app's own UI | In-app Settings page (this recipe) | The choice is internal to how your app behaves. App-only. |

**Step 2 — Within in-app Settings, what shape is the data?**

| Shape | Storage | Recipe |
|---|---|---|
| Flat primitives (string, number, bool) | KV (`rootServer.dataStore.appData`) | **This recipe** |
| List or relational (excluded channels, per-row config) | SQLite (`data-paginated-list` shows the pattern) | Future `app-settings-list-values` |
| Per-context overrides (per-channel, per-thing) | SQLite, keyed by the context | Future `app-settings-per-context` |

This recipe handles the first row in the second table.

## TL;DR

```
                 globalSettings.general.admins
                              │
                              ▼
                     ┌──────────────────┐
   client ──get──►   │  SettingsService │   ──read──►  rootServer.dataStore.appData
   client ──update──►│  (admin-gated)   │   ──write──►       (single key, JSON)
                     └────────┬─────────┘
                              │ broadcast SettingsChanged
                              ▼
                       all connected clients
                       (re-fetch + re-render)
```

The server reads + writes a single KV record holding three flat values. Reads are cheap (in-memory cache, invalidated on write). Writes are admin-gated server-side via `requireAdmin`. Every successful write fires a `SettingsChanged` broadcast so any open Settings tab refreshes; no payload, just a "go ask again" signal.

## Why not globalSettings?

`globalSettings` is right for things community admins manage at install or through the platform's settings UI — the picker, the dropdown, the role selector. It's also the only configuration channel bots have. For app-internal tuning that benefits from a custom UI (bulk forms, conditional fields, validation, multi-step flows), the platform's settings UI isn't the right surface. KV-backed app settings give you a regular React form and an RPC, gated by whichever role globalSettings names.

The two coexist: this recipe uses `globalSettings.general.admins` to decide *who* can edit Settings, and the KV store to hold *what* they're editing.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store) | KV reads/writes via `rootServer.dataStore.appData` | The settings store, including the `update()` atomic-merge pattern |
| [`api-samples/server-global-settings`](../../api-samples/server-global-settings) | The `globalSettings` manifest schema and runtime read | Declare the `admins` `roleOrMember` picker; resolve it to the admin check |
| [`api-samples/server-member-roles`](../../api-samples/server-member-roles) | Membership in a role group | Implicit, via `ReadOnlyMemberGroup.isMember()` against the picker |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services, broadcasts, typed errors | Two callable RPCs + one broadcast (`SettingsChanged`) + the `NOT_ADMIN` typed rejection |

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) declares one global setting — `general.admins`, a `roleOrMember` picker. Community admins fill it with the role(s) and/or members allowed to edit this app's Settings.

`required: false` because the community owner is always elevated regardless of the picker — defense in depth, so misconfiguring the picker can't lock the owner out.

### 2. Proto

[`networking/src/settings_service.proto`](networking/src/settings_service.proto) — two callable RPCs, one broadcast, one error enum:

- `GetSettings` returns the current values plus an `is_admin` flag for the caller. The flag lives on the response so the client can render the form in editable vs read-only mode in a single round trip.
- `UpdateSettings` accepts `optional` fields — proto3 makes each field genuinely optional, and the server treats absent fields as "don't touch this knob." Partial PATCH semantics, not PUT replace.
- `SettingsChangedEvent` is the broadcast for cache invalidation. Empty payload — clients re-fetch on receipt.
- `SettingsError.SETTINGS_ERROR_NOT_ADMIN = 1` is what the server throws when a non-admin calls `UpdateSettings`. The protobuf-ts compiler strips the type prefix on the TS side, so client code reads `SettingsError.NOT_ADMIN` (matching `RootServerException.code`).

### 3. Settings store

[`server/src/settings-store.ts`](server/src/settings-store.ts) wraps `rootServer.dataStore.appData` with three concerns:

- **One key holds the whole record.** Flat shapes serialize cleanly as one JSON value; spreading three knobs across three keys would multiply round trips for no benefit. Lists or relational shapes belong in SQLite.
- **Defaults declared once.** `DEFAULT_SETTINGS` is the source of truth for "what should this look like when nothing's been written yet." Stored partials are merged against it on every read, so a future schema migration that adds a field doesn't return `undefined` for that field on older records.
- **In-memory cache.** The KV layer makes a round trip on every `get()`. For values read on every request, that adds up. Cache the parsed object; invalidate on write.

The write uses the KV API's atomic `update()` so two simultaneous saves serialize without losing one of them.

### 4. Admin check

[`server/src/admin-check.ts`](server/src/admin-check.ts) has two helpers:

- `isAdmin(userId): boolean` — used by `GetSettings` to populate the response's `is_admin` flag. Enables the form's editability check without a separate RPC.
- `requireAdmin(client): void` — throws `RootServerException(NOT_ADMIN)` on failure. Used by `UpdateSettings` to enforce authorization on every write.

Both pivot on the same rule: community owner OR member of the configured `admins` group. The owner-first short-circuit prevents the membership lookup when not needed.

We re-check on every privileged call rather than caching a flag from a prior `GetSettings`. A user demoted between two clicks must see the next save rejected; a stale flag from earlier would let it through.

### 5. Service

[`server/src/settings-service.ts`](server/src/settings-service.ts) glues those together:

- `getSettings` reads from the cache + computes `is_admin` for the caller. Both can run concurrently with `Promise.all`.
- `updateSettings` calls `requireAdmin`, applies the partial via the store's atomic update, fires `SettingsChanged` to all connected clients, and returns the merged values. The return lets the client apply the authoritative result without waiting for the broadcast to round-trip back.

### 6. Broadcasts trigger client refetch

[`server/src/main.ts`](server/src/main.ts) wires one extra source: when `globalSettings` updates (someone changed the admins picker), broadcast `SettingsChanged` even though the stored values didn't move. The picker change shifts every caller's `is_admin` flag, and connected clients should refetch to update the form's editable-vs-read-only state.

### 7. Client

[`client/src/App.tsx`](client/src/App.tsx) fetches on mount, subscribes to `SettingsChanged`, and re-fetches on receipt. The form holds an edit buffer separate from the server-authoritative `stored` state so the user can type freely; the Save button is disabled while pristine and during in-flight saves. Save sends only the fields that differ from stored; the response's merged values are applied locally so the UI doesn't wait for the broadcast to propagate back.

The `is_admin` flag from the server gates editability. The button is hidden for non-admins, fields are `disabled`. That's the visible UX gate — see `ui-feature-by-role` for why server-side enforcement on every privileged RPC is the actual security boundary.

## Does NOT cover

| Concern | Lives in |
|---|---|
| List or relational settings (e.g., excluded channels) | Future `app-settings-list-values` recipe |
| Per-context configuration (e.g., per-channel or per-repo overrides) | Future `app-settings-per-context` recipe |
| Cross-instance cache invalidation | Out of scope for this single-instance recipe. A multi-instance deployment would need an out-of-band coordination channel; the SettingsService broadcast goes to clients, not to sibling app-server instances. |
| Settings versioning / migration of stored values | Independent concern; touch when the settings shape changes after deploy. The defaults-merge in `getSettings` covers additive fields; renames or removals need a migration step. |
| Optimistic UI / undo on failed save | UX concern; this recipe uses simple "save → refetch with merged result" |
| Type-validated forms (zod, etc.) | Independent concern; recipe uses inline form state for clarity |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-app-settings-flat-values` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> Production recipes should never expose a self-test command.

