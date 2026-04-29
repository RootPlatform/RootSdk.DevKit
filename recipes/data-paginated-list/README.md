# Recipe: Cursor-Based Pagination

> *"How do I paginate a server-side list with cursor-based queries and accumulate pages on the client?"*

A SQLite-backed list of records, exposed via an RPC that returns one page at a time. The client accumulates pages with a "Load more" button. When the server returns an empty `next_cursor`, the list is exhausted.

The seeded data — 100 rows labelled `Record 1`…`Record 100` — is **placeholder**. Fork the recipe and replace the schema (and the seed in [`server/src/db.ts`](server/src/db.ts)) with whatever your real list shape is: audit log entries, posts, items in a queue, etc. The pagination mechanic is independent of row contents.

## TL;DR

```
Client                                          Server
──────                                          ──────
mount → listRecords({ cursor: "" }) ──────────► SELECT … WHERE id < MAX_INT ORDER BY id DESC LIMIT 20
       ◄─────── { records: [20 rows], next_cursor: "<opaque>" }
append to local state, keep cursor

click "Load more"
     → listRecords({ cursor: "<opaque>" }) ───► SELECT … WHERE id < <decoded id> ORDER BY id DESC LIMIT 20
       ◄─────── { records: [20 rows], next_cursor: "<opaque>" }
append again

…eventually the server returns next_cursor: "" — done.
```

## Why cursor, not offset

`OFFSET` shifts under inserts. A row added between fetches makes page 2 start at "row 21" while page 1 also showed it as "row 21" — the user sees the same item twice or skips one entirely. Cursor-based queries ask for "rows whose id is less than the last id you saw," which is stable as data changes.

The cursor in this recipe is just `id`. For tables ordered on something with ties (timestamps in particular), you'd encode `(timestamp, id)` together so the query is `WHERE (ts, id) < (?, ?)` — the id breaks ties on equal timestamps. The opaque cursor encoding makes this extension invisible to clients.

## Why the cursor is opaque

The wire format is base64 of small JSON. The client never decodes it — it round-trips whatever the server returned. This means the server can change the encoding (add a timestamp tiebreaker, switch to a hash, version the format) without coordinating with clients. If clients could parse the cursor, every server change would risk breaking deployed clients.

If the client decodes a malformed cursor, the server falls back to "first page" rather than throwing. Clients shouldn't be sending malformed cursors, but degrading gracefully beats surfacing a hard error to a user who can't do anything about it.

## Why empty-string-means-end

`next_cursor === ""` is the canonical "no more pages" signal. A separate `has_more: bool` field would carry the same information but require two branches in the client state machine ("did we get a cursor AND is has_more true?"). One field is enough.

The server detects end-of-list precisely by querying `pageSize + 1` rows and trimming the extra. If the trim happened, there's at least one more row → return a cursor. If it didn't (we got `pageSize` or fewer rows), there's nothing past this page → return empty cursor. The cost is one extra row of work per page; the win is the last user-facing page already knows it's the last. A cheaper variant — ask for exactly `pageSize` and infer end from "got fewer than asked" — sacrifices precision: the last full page returns a non-empty cursor that yields `[]` on the next call, making the user click "Load more" once for nothing. The extra-row variant is the canonical choice for user-facing pagination.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-app-data-store`](../../api-samples/server-app-data-store) | SQLite via `rootServer.dataStore` | The `records` table, schema migration, and idempotent seeding |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services | The `ListService.listRecords` RPC |
| [`api-samples/client-app-services`](../../api-samples/client-app-services) | Calling app services from the client | `listServiceClient.listRecords({ cursor })` |

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) declares no settings — pagination is a behavioural concern, not a configurable one. Page size is constant in code (server-capped); cursor encoding is server-internal.

The only permission is `channel.createMessage`, used by the test driver. Forks should drop it if they don't otherwise need to post messages.

### 2. Proto

[`networking/src/list_service.proto`](networking/src/list_service.proto) — one RPC, three messages:

- `ListRecordsRequest { page_size, cursor }` — both optional. Empty cursor = first page.
- `ListRecordsResponse { records[], next_cursor }` — empty cursor = end of list.
- `Record { id, created_at, label }` — placeholder shape; replace in your fork.

### 3. Storage

[`server/src/db.ts`](server/src/db.ts) follows the canonical SQLite pattern:

- Single shared `sqlite3.Database` opened once on startup
- Promisified helpers (`run`, `get`, `all`)
- Idempotent migration with `CREATE TABLE IF NOT EXISTS`
- Idempotent seed gated by a `COUNT(*)` check (not `INSERT OR IGNORE`, which doesn't help when the unique key is `AUTOINCREMENT`)
- Seed inserts wrapped in a transaction so 100 inserts hit one fsync, not 100

### 4. The paged query

[`server/src/list-service.ts`](server/src/list-service.ts) — the actual lesson:

```sql
SELECT id, created_at, label
FROM records
WHERE id < ?              -- decoded cursor; MAX_SAFE_INTEGER for first page
ORDER BY id DESC
LIMIT ?                   -- server-capped pageSize
```

The first-page case uses `MAX_SAFE_INTEGER` as the seek bound so the query shape is identical for every page — no separate first-page branch.

### 5. Client state machine

[`client/src/App.tsx`](client/src/App.tsx) holds five pieces of state:

- `records[]` — accumulated, never replaced
- `cursor` — opaque, sent on the next call
- `loading` — disables the button to prevent double-fire
- `done` — flips when `next_cursor === ""`; hides the button
- `error` — displayed inline; recover by retrying

Initial load fires on mount; subsequent loads on button click. Same `fetchPage` function for both — the only difference is whether the user clicked something.

For an infinite-scroll variant: replace the button with an `IntersectionObserver` watching a sentinel at the bottom of the list. The observer's callback calls `fetchPage(cursor)`. Same state, different trigger.

## Does NOT cover

| Concern | Lives in |
|---|---|
| **Live updates** — inserting new rows visible in already-loaded pages | A separate recipe (deferred until streaming-subscription test infrastructure lands) |
| **Filtering and search** — paginating a filtered subset | Independent concern; the cursor encoding extends naturally to carry the filter, but multi-axis pagination has its own design space |
| **Virtualized rendering** — only paint visible rows for very long lists | Independent of pagination mechanics; a real app uses `react-window` or similar regardless of how data is fetched |
| **Pull-to-refresh** — re-fetching the latest page from the top | Adjacent feature with its own state-machine wrinkles (overlap with already-loaded rows, dedup) |
| **Stable ordering across columns** — pagination over `ORDER BY total_xp DESC` with ties | The cursor extends to a tuple `(total_xp, id)` and the query becomes `WHERE (total_xp, id) < (?, ?)`. Same shape, more parameters. |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-data-paginated-list` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> The driver dispatches by method name and accepts an optional base64-encoded JSON request payload (`/test-data-paginated-list <method> <userIds> [<base64-json-request>]`). Response payloads are flattened to summary `key=value` lines. Production recipes should never expose a self-test command.

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

Open the client URL Vite prints. You should see "Record 100" through "Record 81" on initial load, with a "Load more" button below. Click through five times to exhaust the list; the button disappears and "You've reached the end." appears.
