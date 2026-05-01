---
kind: recipe
category: data
question: How do I batch-prefetch related data (e.g. 50 user profiles for a list of activities) in one call instead of N+1 from the client?
composes:
  - server-database
  - networking-app-services
exemplified_by: null
---

# Recipe: Batch-Prefetch Related Data

> *"How do I batch-prefetch related data (e.g., 50 user profiles for a list of activities) in one call instead of N+1 from the client?"*

A list of activities where each row references an actor by id, and a batch RPC that resolves all distinct actor ids in one round trip. The client deduplicates ids before sending and caches resolved owners across refreshes.

## TL;DR

```
       Naive client                  This recipe's client
       ────────────                  ────────────────────
   ┌──────────────────┐         ┌──────────────────────────┐
   │ list activities  │ — RPC   │ list activities          │ — RPC
   │ for each item:   │         │ collect distinct actor_ids│
   │   get owner      │ — RPC   │ skip ids in cache        │
   │   get owner      │ — RPC   │ batch the rest           │ — RPC
   │   …              │ — RPC   └──────────────────────────┘
   │   get owner      │ — RPC          2 round trips
   └──────────────────┘
        N+1 round trips
```

For 10 activities with 5 distinct actors: naive = 11 RPCs, batched = 2. For 50 activities with 10 distinct actors: naive = 51, batched = 2. Naive scales with `activities`; batched scales with **distinct actors**.

## The two pieces an agent has to learn together

**Server side**: a batch RPC that takes an array of ids and returns a map keyed by id. The SQL is `WHERE id IN (?, ?, ?, …)` parameterized — never string-interpolated. Missing ids are silently absent from the response (callers render them as "unknown").

**Client side**: deduplicate ids before sending, render with placeholders while the batch is in flight, merge results on response. Optionally cache resolved entries across refreshes so a re-fetch only resolves *new* ids.

The client-side dedup is the part most agents miss. A "batched" client that sends `activity.actorId` for every activity (not deduped) is technically one RPC, but it's still wasteful — 50 activities sharing 10 distinct actors should send 10 ids, not 50.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-database`](../../api-samples/server-database) | SQLite via `rootServer.dataStore` | Two seeded tables (activities, owners) and a parameterized batch query |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services + proto wire shapes | The `map<string, OwnerInfo>` response — first recipe to use a proto map |

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) is minimal — no settings, no admin gate. Only permission is `channel.createMessage` for the test driver.

### 2. Proto

[`networking/src/activity_service.proto`](networking/src/activity_service.proto) defines two RPCs:

- `ListActivities` returns a flat list of activity rows, each with an `actor_id`.
- `BatchGetOwners` takes `repeated string owner_ids` and returns `map<string, OwnerInfo> owners`.

The `map<>` is the new shape worth pointing at. proto3 maps land on the TypeScript side as index-signature objects:

```typescript
owners: { [key: string]: OwnerInfo };
```

Iterate with `Object.keys()` / `Object.entries()`; lookup with `owners[id]`. Missing keys are simply absent — no need for an explicit "not found" enum or a null marker.

### 3. The batch query

[`server/src/activity-store.ts`](server/src/activity-store.ts) does the central trick:

```typescript
const placeholders = ids.map(() => "?").join(", ");
const sql = `
  SELECT id, display_name, color
  FROM owners
  WHERE id IN (${placeholders})
`;
const rows = await all<OwnerRow>(getDb(), sql, ids);
```

Two things to internalize:

- **The placeholder list is dynamic, but the SQL is still parameterized.** Each `?` binds to one position in the `ids` array — values flow through the SQLite driver, never get concatenated into the SQL text. `WHERE id IN (${ids.join(",")})` would be a textbook SQL injection; don't do that.
- **Empty input short-circuits.** `WHERE id IN ()` is a syntax error in SQLite; the recipe checks `ids.length === 0` and returns an empty Map without touching the DB.

For very large id arrays, SQLite has `SQLITE_MAX_VARIABLE_NUMBER` (default 999, raised in newer builds). A real app with potentially-huge requests chunks the input — out of scope for this recipe's toy data.

### 4. The client flow

[`client/src/App.tsx`](client/src/App.tsx)'s `handleFetch` is the lesson:

```typescript
// Stage 1
const listResponse = await activityServiceClient.listActivities({});
const fresh = listResponse.activities ?? [];
setActivities(fresh);

// Stage 2: dedup + cache filter
const distinctActorIds = Array.from(new Set(fresh.map((a) => a.actorId)));
const unresolvedIds = distinctActorIds.filter((id) => !(id in ownersCache));
if (unresolvedIds.length === 0) return;

// One batched call for whatever's left
const ownersResponse = await activityServiceClient.batchGetOwners({
  ownerIds: unresolvedIds,
});
setOwnersCache((prev) => ({ ...prev, ...(ownersResponse.owners ?? {}) }));
```

Three steps, in order:

1. **Set dedup** — turn the per-activity `actorId` list into the unique values
2. **Cache filter** — strip ids we've already resolved on a prior fetch
3. **Batch RPC** — single call for whatever's left

Render handles missing owners gracefully (`owner ? owner.displayName : "(unknown)"`) so the list isn't held hostage by the second-stage round trip.

### 5. Cache (incidental)

The component holds a `Record<string, OwnerInfo>` keyed by id. The cache grows for the lifetime of the component and is dropped on unmount. Real apps cap with LRU or use a fetching library (TanStack Query, SWR) that handles caching, deduplication, retry, and TTL. The recipe's hand-rolled cache is incidental to the lesson; the dedup + single-batch-RPC pattern is what matters.

## Does NOT cover

| Concern | Lives in |
|---|---|
| Pagination of the activity list | [`data-paginated-list`](../data-paginated-list) |
| Live updates when activities are added | Future recipe behind Level 3 broadcast support |
| Debounced search / filtering | Future recipe |
| Caching responses with TTL across mounts (real cache) | Future external-cache-with-ttl recipe (after HTTP api-sample lands) |
| Server-side joins (`SELECT … JOIN owners ON …`) | Independent concern; this recipe deliberately keeps the queries separate so the batch lesson is visible |
| Mutation paths (add activity, edit owner) | No writes in this recipe; the settings series covers admin-gated writes |
| Real referential integrity (`FOREIGN KEY`) | Out of scope; recipe's `actor_id` is just a TEXT column for portability |
| Chunking very large id arrays past SQLite's variable-count limit | Out of scope; toy data has at most 5 distinct ids |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-data-batch-prefetch` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> Production recipes should never expose a self-test command.

## Build and run

```bash
# From this directory
npm install
npm run build       # builds networking → server → client

# Then in two terminals, each starting from this recipe root
# (set DEV_TOKEN in server/.env first):
cd server && npm run server      # devhost — terminal 1
# In a separate terminal, also from this recipe root:
cd client && npm run client      # vite — terminal 2
```

Open the client URL Vite prints. You'll see 10 activity rows; each renders with the actor's display name and a small colored dot keyed off the owner's color. Hit Refresh — the activities list re-fetches but the owners come straight from cache (no second RPC; check the network tab to see the difference).
