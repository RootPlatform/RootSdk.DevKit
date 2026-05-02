---
kind: recipe
category: app-settings
question: "How do I let admins configure my app's behavior per-context — per-channel, per-repo, per-thing — with multi-field rows keyed by the entity?"
composes:
  - server-database
  - server-global-settings
  - server-member-roles
  - networking-app-services
exemplified_by: null
---

# Recipe: App Settings (Per-Context)

> *"How do I let admins configure my app's behavior per-context — different settings for different channels, repos, or other entities — and persist those configs in SQLite keyed by the entity?"*

> ⚠️ **App-only recipe.** Bots have no UI surface and configure exclusively through `globalSettings`. See the bot configuration explanation for that path.

A SQLite-backed `channel_configs` table where each row is keyed by the platform's channel id. Admins can add a row (creating a config for a previously-unconfigured channel), edit any row's fields, or remove the row (channel reverts to using app-wide defaults). Closes the settings series alongside [`app-settings-flat-values`](../app-settings-flat-values) and [`app-settings-list-values`](../app-settings-list-values).

## Two-step decision: where do my settings live?

Same tree as the other recipes in the series, now answering the third row:

**Step 1 — Who configures this?**

| Configurer | Storage | Recipe |
|---|---|---|
| Community admins, at install or via the platform's Settings UI | `globalSettings` | (declared in `root-manifest.json`; bots can only do this) |
| App admins, at runtime, via your app's own UI | In-app Settings page | This series |

**Step 2 — Within in-app Settings, what shape is the data?**

| Shape | Storage | Recipe |
|---|---|---|
| Flat primitives (string, number, bool) | KV | [`app-settings-flat-values`](../app-settings-flat-values) |
| List or relational (single-field rows, individual add/remove) | SQLite, auto-increment id | [`app-settings-list-values`](../app-settings-list-values) |
| **Per-context overrides (multi-field rows keyed by an external entity)** | **SQLite, entity id as PK** | **This recipe** |

This recipe handles the third row.

## TL;DR

```
                 globalSettings.general.admins
                              │
                              ▼
                   ┌───────────────────────┐
   client ──list───►│  ChannelConfigsService │  ──SELECT────►  channel_configs (SQLite)
   client ──upsert─►│  (admin-gated mut.)    │  ──INSERT…────►       (channel_id is PK)
   client ──delete►│                        │   ON CONFLICT
                   │                        │   DO UPDATE…
                   │                        │  ──DELETE────►
                   └────────────┬───────────┘
                                │ broadcast ChannelConfigsChanged
                                ▼
                         all connected clients
                         (re-fetch + re-render)
```

The server stores one row per configured channel. Upsert is `INSERT … ON CONFLICT DO UPDATE` — one statement, one round trip, no read-modify-write race. Delete is the SQL primitive. Both mutations broadcast `ChannelConfigsChanged` so other clients refetch.

## Why not the prior recipes in the series?

This is the third recipe in the settings series. The trade-offs:

- **vs `app-settings-flat-values`** — flat-values stores one fixed record (welcomeMessage, maxItems, showTimestamps) under a single KV key. KV's `update()` callback makes partial-merge cheap and natural. But there's no concept of "many of these" — when each setting needs to be scoped to an entity (channel, repo, user), KV would force you to either smash all of them into one giant blob or invent your own key naming scheme. SQLite's per-row keying is the right shape.

- **vs `app-settings-list-values`** — list-values stores a flat list of strings (blocked terms) keyed by an auto-increment id you don't see. Each row is a single payload field. When the row needs **multiple typed fields** AND is **keyed by an external entity** (the platform's channel id, not an internal sequence number), you've moved into per-context territory: real entity id as primary key, multi-column row, upsert as the natural mutation primitive.

The decision tree: **flat record → KV; collection of single-field items → SQLite list; per-entity multi-field config → SQLite keyed by entity id.**

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-database`](../../api-samples/server-database) | SQLite via `rootServer.dataStore` | The `channel_configs` table, upsert via `INSERT … ON CONFLICT DO UPDATE`, per-row delete |
| [`api-samples/server-global-settings`](../../api-samples/server-global-settings) | The `globalSettings` manifest schema and runtime read | Declare the `admins` `roleOrMember` picker; resolve it to the admin check |
| [`api-samples/server-member-roles`](../../api-samples/server-member-roles) | Membership in a role group | Implicit, via `ReadOnlyMemberGroup.isMember()` |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services, broadcasts, typed errors | Three callable RPCs + one broadcast (`ChannelConfigsChanged`) + three typed rejections (`NOT_ADMIN`, `INVALID_CHANNEL_ID`, `INVALID_PRIORITY`) |

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) declares `general.admins` — same picker as the prior recipes in the series.

### 2. Proto

[`networking/src/channel_configs_service.proto`](networking/src/channel_configs_service.proto) — three callable RPCs, one broadcast, one error enum:

- `ListChannelConfigs` returns the full list + `is_admin` for the caller.
- `UpsertChannelConfig` (admin-only) inserts if no row exists for `channel_id`, or fully replaces if one does. The caller sends every field every time — full-replace semantics.
- `DeleteChannelConfig` (admin-only) removes the row; idempotent.
- `ChannelConfigsError` has three codes: `NOT_ADMIN`, `INVALID_CHANNEL_ID` (empty/whitespace), `INVALID_PRIORITY` (out of 0–100 range). The protobuf-ts compiler strips the type prefix on the TS side, so client code reads `ChannelConfigsError.NOT_ADMIN` even though the proto declares `CHANNEL_CONFIGS_ERROR_NOT_ADMIN`.

### 3. Schema

[`server/src/db.ts`](server/src/db.ts):

```sql
CREATE TABLE IF NOT EXISTS channel_configs (
  channel_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  priority INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_channel_configs_updated_at
  ON channel_configs (updated_at DESC, channel_id DESC);
```

Three things:

- `channel_id TEXT PRIMARY KEY` — the platform's channel id is the natural key. PRIMARY KEY gives us UNIQUE + an index for free, and it's the column the upsert's `ON CONFLICT` clause targets. No separate auto-increment id needed — the entity id IS the row id.
- `enabled INTEGER` — SQLite has no native bool, so 0/1. The store's row mapper coerces to/from JS boolean at the boundary.
- Composite index on `(updated_at DESC, channel_id DESC)` — covers the list query's full sort. Same rationale as `app-settings-list-values`' index: tiebreak on the secondary column or the tied subrange sorts in memory and defeats the index when collisions happen.

### 4. The upsert idiom

[`server/src/channel-configs-store.ts`](server/src/channel-configs-store.ts) does the central trick:

```sql
INSERT INTO channel_configs (channel_id, enabled, priority, updated_at)
VALUES (?, ?, ?, ?)
ON CONFLICT(channel_id) DO UPDATE SET
  enabled    = excluded.enabled,
  priority   = excluded.priority,
  updated_at = excluded.updated_at
```

`excluded.*` refers to the values the `INSERT` *would have* written had it succeeded. One statement. Atomic. No read-modify-write race.

Compare with `app-settings-flat-values`: KV's `update()` callback handles partial-merge naturally (read-then-write inside the atomic callback). SQL's upsert handles full-replace naturally. Each storage shape biases toward a different mutation idiom; trying to force the other shape on top of either is fighting the database.

If your fork needs partial update on top of SQL upsert, the pattern is `COALESCE(excluded.col, col)` for each column, with optional fields nullable in the request — workable but noisier. Most per-context apps end up shipping full-replace forms in the UI anyway, which collapses the distinction.

### 5. Admin check

[`server/src/admin-check.ts`](server/src/admin-check.ts) is the **third near-identical copy** in the settings series. The only difference across copies is the error-enum import. Recipes read top-to-bottom, so I haven't extracted a shared helper yet; when the SDK ships a typed admin helper, all three drop their copies.

### 6. Service

[`server/src/channel-configs-service.ts`](server/src/channel-configs-service.ts) glues the pieces together. Mutation handlers all follow this shape:

```typescript
async upsertChannelConfig(request, client) {
  await requireAdmin(client);                              // server-side authz
  let saved;
  try {
    saved = await upsertConfig(request.channelId, request.enabled, request.priority);
  } catch (err) {
    if (err instanceof InvalidChannelIdError) {
      throw new RootServerException(ChannelConfigsError.INVALID_CHANNEL_ID, err.message);
    }
    if (err instanceof InvalidPriorityError) {
      throw new RootServerException(ChannelConfigsError.INVALID_PRIORITY, err.message);
    }
    throw err;
  }
  this.broadcastChannelConfigsChanged({}, "all");
  return { config: toMessage(saved) };
}
```

The store throws domain-specific validation errors; the handler maps them to typed proto rejections. Without those catches the validation errors escape as untyped server errors and the client loses the chance to match `err.code`.

### 7. Broadcasts trigger client refetch

[`server/src/main.ts`](server/src/main.ts) wires one extra broadcast source: when `globalSettings` updates (someone changed the admins picker), broadcast `ChannelConfigsChanged` even though the configs didn't change. The picker change shifts every caller's `is_admin` flag, and connected clients should refetch to update edit affordances. (Same scope caveat as the prior recipes: this fires on any general-group setting change, not just the admins picker — if you fork the recipe and add another setting in the same group, narrow the predicate or accept the over-broadcast.)

### 8. Client

[`client/src/App.tsx`](client/src/App.tsx) is the summary-detail editor. Per row: inline `enabled` toggle + `priority` input + Save + Remove. Above the list: an Add row with a channel-id text input + the same inline editors + an Add button.

The channel-id input is plain text — admins paste in a channel id. A real app would replace this with a channel picker (`client-app-channels` territory); this recipe focuses on the per-context mechanic, not channel discovery.

State management:

- The server's list is the authoritative source. We hold it in `configs`.
- Per-row `edits` is a buffer: the user's pending changes before they hit Save. Keyed by `channelId` so each row's edits stay independent.
- On every fetch (mount, broadcast, after a save), `edits` resets to mirror the server. Pending unsaved edits get clobbered — same call as the prior recipes (showing pending atop new authoritative state is more confusing than starting fresh).
- Per-row Save sends the buffer's values as a full-replace upsert; per-row Remove sends a delete.

`is_admin` from the server gates the inline editors and buttons. Non-admins see the same data, read-only. The security boundary is server-side `requireAdmin` on every mutation — UI gating is for visibility only.

The StrictMode latch + in-flight request counter are the same patterns as the prior recipes: gate the initial fetch only (let the on/off subscription pair run on every cycle), drop stale fetch responses if a newer fetch started.

## Does NOT cover

| Concern | Lives in |
|---|---|
| Flat-primitive settings (no per-entity scope) | [`app-settings-flat-values`](../app-settings-flat-values) |
| Single-field list of items (no per-entity scope) | [`app-settings-list-values`](../app-settings-list-values) |
| Channel discovery / channel picker UI | Independent concern; this recipe takes channel id as text input |
| Per-context settings that **inherit** from app-wide defaults | This recipe assumes "no row = use defaults" but doesn't show the runtime read path that consults both |
| Migration when changing the schema | Independent concern; touch when settings shape changes after deploy |
| Cross-instance cache invalidation | Out of scope (single-instance) |
| Bulk operations (configure 50 channels at once) | Single-row recipe; bulk would be a transaction wrapper around the upsert primitive |
| Partial update (change just one field per call) | This recipe is full-replace per the upsert idiom; partial is possible with `COALESCE(excluded.col, col)` per column but noisier |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-app-settings-per-context` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> Production recipes should never expose a self-test command.

