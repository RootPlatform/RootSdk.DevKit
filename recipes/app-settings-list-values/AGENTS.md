---
kind: recipe
category: app-settings
question: How do I persist a list-shaped setting (collection of items, add/remove individually) in SQLite with admin-gated mutations?
composes:
  - server-database
  - server-global-settings
  - server-member-roles
  - networking-app-services
exemplified_by: leveling-leaderboard
---

# Recipe: App Settings (List Values)

> *"How do I persist a list-shaped setting (collection of items, add/remove individually) in SQLite with admin-gated mutations and reactive client refresh?"*

> ⚠️ **App-only recipe.** Bots have no UI surface and configure exclusively through `globalSettings`. See the bot configuration explanation for that path.

A SQLite-backed `blocked_terms` list, an add/remove UI gated by an admin role, and a broadcast that drives client re-fetches when the list changes. Second recipe in the settings series — pairs with [`app-settings-flat-values`](../app-settings-flat-values) (KV-backed flat primitives) on the storage decision tree.

## Two-step decision: where do my settings live?

Same tree as [`app-settings-flat-values`](../app-settings-flat-values), now answering the second-step question for list-shaped data:

**Step 1 — Who configures this?**

| Configurer | Storage | Recipe |
|---|---|---|
| Community admins, at install or via the platform's Settings UI | `globalSettings` | (declared in `root-manifest.json`; bots can only do this) |
| App admins, at runtime, via your app's own UI | In-app Settings page | This series |

**Step 2 — Within in-app Settings, what shape is the data?**

| Shape | Storage | Recipe |
|---|---|---|
| Flat primitives (string, number, bool) | KV | [`app-settings-flat-values`](../app-settings-flat-values) |
| **List or relational (collection of items, per-row add/remove)** | **SQLite** | **This recipe** |
| Per-context overrides (per-channel, per-thing) | SQLite, composite key | Future `app-settings-per-context` |

This recipe handles row 2.

## TL;DR

```
                 globalSettings.general.admins
                              │
                              ▼
                    ┌──────────────────────┐
   client ──list─►  │ BlockedTermsService  │  ──SELECT──►  blocked_terms (SQLite)
   client ──add──►  │  (admin-gated mut.)  │  ──INSERT─►       (UNIQUE term)
   client ──rm──►   │                      │  ──DELETE─►
                    └──────────┬───────────┘
                               │ broadcast BlockedTermsChanged
                               ▼
                        all connected clients
                        (re-fetch + re-render)
```

The server stores rows in a SQLite table with `UNIQUE` on the term value. Add is `INSERT OR IGNORE` (idempotent — duplicate adds no-op). Remove is `DELETE WHERE id = ?`. Both mutation responses return the **full updated list**, saving the client a second round trip. Every successful mutation broadcasts `BlockedTermsChanged` so other connected clients refetch.

## Why not KV?

[`app-settings-flat-values`](../app-settings-flat-values) used `rootServer.dataStore.appData` (KV) because the data was a small, bounded record of three fields edited as one unit. List-shaped settings push KV in two awkward directions:

- **Whole-list-as-blob.** Store the array under one key; `update()` to add a row reads the entire list, mutates, and writes it back. Works for tiny lists. Concurrent edits collide on the read-modify-write window unless you wrap every mutation in the KV `update()` callback (which serializes them via the KV layer's atomicity). Scales poorly: a 500-item list re-serializes 500 items on every add.
- **One key per row.** Sidesteps the blob problem but loses the natural "give me the whole list" query — KV's `select<T>(pattern)` exists, but you've now got to decide a key naming scheme, manage your own ordering by added-at, and pay extra round trips to enumerate.

SQLite is one-liner correct for both: indexed `SELECT … ORDER BY added_at DESC` for the list, `INSERT OR IGNORE` for idempotent add, `DELETE WHERE id` for remove. Per-row identity via `id INTEGER PRIMARY KEY AUTOINCREMENT` is built in.

The decision tree: **flat record → KV; collection of rows → SQLite.**

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-database`](../../api-samples/server-database) | SQLite via `rootServer.dataStore` | The `blocked_terms` table, idempotent add via `INSERT OR IGNORE`, per-row delete |
| [`api-samples/server-global-settings`](../../api-samples/server-global-settings) | The `globalSettings` manifest schema and runtime read | Declare the `admins` `roleOrMember` picker; resolve it to the admin check |
| [`api-samples/server-member-roles`](../../api-samples/server-member-roles) | Membership in a role group | Implicit, via `ReadOnlyMemberGroup.isMember()` |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services, broadcasts, typed errors | Three callable RPCs + one broadcast (`BlockedTermsChanged`) + the `NOT_ADMIN` and `INVALID_TERM` typed rejections |

The canonical real-world reference for list-shaped settings in DevKit is leveling-leaderboard's `excluded_channels` table — same shape, same operations, applied to channel IDs instead of arbitrary strings.

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) declares `general.admins` — same picker as [`app-settings-flat-values`](../app-settings-flat-values). Community admins fill it with the role(s) and/or members allowed to manage the list.

`required: false` because the community owner is always elevated regardless of the picker.

### 2. Proto

[`networking/src/blocked_terms_service.proto`](networking/src/blocked_terms_service.proto) — three callable RPCs, one broadcast, one error enum:

- `ListBlockedTerms` returns the full list + `is_admin` for the caller. List sorted newest-first.
- `AddBlockedTerm` and `RemoveBlockedTerm` are admin-only mutations; both return the **full updated list** so the client doesn't re-fetch after each mutation.
- `BlockedTermsChangedEvent` is the broadcast for cache invalidation. Empty payload — clients re-fetch on receipt.
- `BlockedTermsError`: two codes — `NOT_ADMIN` for unauthorized callers, `INVALID_TERM` for failed validation (empty/too-long terms). The protobuf-ts compiler strips the type prefix, so client code reads `BlockedTermsError.NOT_ADMIN` even though the proto declares `BLOCKED_TERMS_ERROR_NOT_ADMIN`.

### 3. Schema

[`server/src/db.ts`](server/src/db.ts) creates the table:

```sql
CREATE TABLE IF NOT EXISTS blocked_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL UNIQUE,
  added_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blocked_terms_added_at
  ON blocked_terms (added_at DESC, id DESC);
```

Three things to note:

- `id INTEGER PRIMARY KEY AUTOINCREMENT` — stable per-row identity that `RemoveBlockedTerm` takes as its argument. AUTOINCREMENT (vs implicit ROWID) guarantees ids are never reused after deletes; `RemoveBlockedTerm({id: 42})` won't accidentally delete a future row that recycled `42`.
- `UNIQUE` on `term` — turns add into a one-line idempotent operation via `INSERT OR IGNORE`. No check-then-insert race.
- Composite index on `(added_at DESC, id DESC)` — covers the list query's full sort order. The `id` tiebreak matters because two adds in the same millisecond produce equal `added_at` values; without the tiebreak the row order between them is engine-defined and unstable across reads. The index has to include the tiebreak column or SQLite sorts the tied subrange in memory, defeating the index when collisions happen.

### 4. Store

[`server/src/blocked-terms-store.ts`](server/src/blocked-terms-store.ts) wraps the table in three operations:

- `listTerms()` — cached. Returns the full list.
- `addTerm(value)` — trims, validates length, `INSERT OR IGNORE`, refreshes the cache, returns the full list.
- `removeTerm(id)` — `DELETE WHERE id`, refreshes the cache, returns the full list.

Validation lives here, not in the service. Putting it next to the persistence layer keeps the contract local — when you fork the recipe and change the term type to (say) URLs, you tighten validation in one place. The service handler maps `InvalidTermError` to the proto's `INVALID_TERM` typed rejection.

The cache is the same in-memory pattern as [`app-settings-flat-values`](../app-settings-flat-values): drop on every mutation, rehydrate on the next read. Single-instance deployments don't see the residual race that a multi-instance deployment would (where another instance writes between this instance's INSERT and refresh); cross-instance is out of scope for the recipe.

### 5. Admin check

[`server/src/admin-check.ts`](server/src/admin-check.ts) is **near-identical** to the same file in [`app-settings-flat-values`](../app-settings-flat-values) — only the error-enum import differs. The duplication is a teaching choice (recipes read top-to-bottom, no cross-recipe imports); when the SDK ships a typed admin helper, all the recipes in the series drop their copies.

### 6. Service

[`server/src/blocked-terms-service.ts`](server/src/blocked-terms-service.ts) glues the pieces together. Mutation handlers follow this shape:

```typescript
async addBlockedTerm(request, client) {
  await requireAdmin(client);                              // server-side authz
  let rows: BlockedTerm[];
  try {
    rows = await addTerm(request.term);                    // store validates + writes
  } catch (err) {
    if (err instanceof InvalidTermError) {
      // Map the store's validation error to the proto's typed rejection.
      // Without this catch the error escapes as an untyped server error
      // and the client loses the chance to match err.code.
      throw new RootServerException(BlockedTermsError.INVALID_TERM, err.message);
    }
    throw err;
  }
  this.broadcastBlockedTermsChanged({}, "all");            // tell other clients
  return { terms: rows.map(toMessage) };                   // return the new list
}
```

`requireAdmin` throws `RootServerException(NOT_ADMIN)` for unauthorized callers; the store throws `InvalidTermError` for validation failures, which the handler maps to `RootServerException(INVALID_TERM)`. The client matches `err.code` against `BlockedTermsError.NOT_ADMIN` and `BlockedTermsError.INVALID_TERM` to render distinct messages.

### 7. Broadcasts trigger client refetch

[`server/src/main.ts`](server/src/main.ts) wires one extra broadcast source: when `globalSettings` updates (someone changed the admins picker), broadcast `BlockedTermsChanged` even though the list didn't change. The picker change shifts every caller's `is_admin` flag, and connected clients should refetch to update the form's editable-vs-read-only state.

### 8. Client

[`client/src/App.tsx`](client/src/App.tsx) fetches on mount, subscribes to `BlockedTermsChanged`, and re-fetches on receipt. The list is rendered with per-row "Remove" buttons (admin-only) and an add input (admin-only). Each mutation applies the response's authoritative list locally, no separate refetch needed; the broadcast still fires and triggers another refetch, which is harmless (it produces the same list).

`is_admin` from the server gates the edit affordances. The remove buttons and add input are hidden for non-admins, who see the list read-only. That's the visible UX gate — the security boundary is server-side `requireAdmin` on every mutation, see [`ui-feature-by-role`](../ui-feature-by-role) for the canonical lesson.

The StrictMode latch (gate the initial fetch only, not the on/off subscription pair) is the same pattern as [`app-settings-flat-values`](../app-settings-flat-values) — see that recipe's commentary for why guarding the subscription too is wrong in dev.

## Does NOT cover

| Concern | Lives in |
|---|---|
| Flat-primitive settings (welcome message, max items) | [`app-settings-flat-values`](../app-settings-flat-values) |
| Per-context configuration (per-channel, per-repo) | Future `app-settings-per-context` |
| Multi-field rows (each row has multiple typed fields, not just a single string) | Out of scope — fork the recipe, expand the schema, the store + service pattern carries forward unchanged |
| Bulk operations (add many at once, "clear all") | This recipe is single-row; bulk would be a transaction wrapper around the same primitives |
| Search / filter within a long list | Independent UX concern; long lists also need pagination — see [`data-paginated-list`](../data-paginated-list) for the cursor pattern |
| Two-level nested structure (groups of groups) | Out of scope; see `apps/self-roles` for the canonical reference if your shape is more elaborate than a flat list |
| Cross-instance cache invalidation | Out of scope for this single-instance recipe |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-app-settings-list-values` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> Production recipes should never expose a self-test command.

