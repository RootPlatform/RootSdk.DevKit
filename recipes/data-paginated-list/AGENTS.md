---
kind: recipe
category: data
question: How do I paginate a server-side list with cursor-based queries, accumulate pages on the client, and search it without breaking the paging?
composes:
  - server-database
  - networking-app-services
exemplified_by: leveling-leaderboard
---

# Recipe: Cursor-Based Pagination

> *"How do I paginate a server-side list with cursor-based queries, accumulate pages on the client, and search it without breaking the paging?"*

A SQLite-backed list of records, exposed via an RPC that returns one page at a time. The client accumulates pages with a "Load more" button. When the server returns an empty `next_cursor`, the list is exhausted. A search box filters the list **on the server**, because a paginated response is a window and filtering it on the client searches the window instead of the list.

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

type "wid" in the search box (debounced 300ms)
     → listRecords({ cursor: "", search: "wid" }) ► SELECT … WHERE id < MAX AND LOWER(label) LIKE '%wid%' LIMIT 20
       ◄─────── { records: [matches], next_cursor: "<opaque, carries "wid">" }
REPLACE local state — this is a new query, not more of the old one
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

## Why the server filters, and the client never does

The client holds the pages it has fetched. Filtering that array answers "which of the rows I already have match?", which is not the question the user asked. On a list of 40 with a page size of 20, a client-side filter searches half the data and looks completely correct.

The failure has no symptom. There is no error, no empty state, and no wrong-looking output — matches that exist are simply not returned, and the behaviour degrades continuously as the table grows. It also cannot be caught by running the app: seed and fixture data are almost always smaller than one page, so during development every row is in the first page and the filter appears to work perfectly.

So `search` goes in the request. The filter and the seek live in the same SQL, which means paging walks the matching rows rather than walking every row and discarding non-matches.

## Why the cursor carries the search term

A cursor means "the last id you saw" — but only within the query that produced it. Pair a cursor from an unfiltered listing with `search: "wid"` and the server seeks past every match above that id and returns a page that is missing rows for no visible reason.

The cursor payload therefore carries the term it was issued under, and the server restarts from the first page when the term differs. This is the payoff of the opaque-cursor decision above: the payload gained a field and no client had to change.

A well-behaved client also resets its own pagination when the term changes, which the client here does. Both halves are worth having — the client reset is the mechanism, the server check is what makes a client bug produce a correct-if-slower answer instead of a silently short list.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-database`](../../api-samples/server-database) | SQLite via `rootServer.dataStore` | The `records` table, schema migration, and idempotent seeding |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services | The `ListService.listRecords` RPC |

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

## Not covered here — safe to go elsewhere

Nothing below is a trap. Each is a genuinely separate concern; build it where it belongs.

| Concern | Lives in |
|---|---|
| **Live updates** — inserting new rows visible in already-loaded pages | A separate recipe (deferred until streaming-subscription test infrastructure lands) |
| **Virtualized rendering** — only paint visible rows for very long lists | Independent of pagination mechanics; a real app uses `react-window` or similar regardless of how data is fetched |
| **Pull-to-refresh** — re-fetching the latest page from the top | Adjacent feature with its own state-machine wrinkles (overlap with already-loaded rows, dedup) |

## Not covered here — and the obvious approach is wrong

These are extensions this recipe does not implement, where the naive version is silently broken rather than merely incomplete. Read the trap before you build one.

| Extension | The trap | The shape that works |
|---|---|---|
| **Multi-field or multi-axis filtering** — filter by status *and* author *and* date | Adding filters client-side once one filter already lives on the server. The two disagree the moment the data exceeds a page, and the server-filtered subset makes the client-filtered result look plausible. | Every filter goes in the request, and all of them go into the cursor payload's fingerprint. One query, one cursor, one source of truth. |
| **Stable ordering across columns** — paging over `ORDER BY total_xp DESC` with ties | Seeking on the sort column alone. Rows with equal `total_xp` straddle the page boundary, so some are served twice and others never. | The cursor becomes a tuple `(total_xp, id)` and the query becomes `WHERE (total_xp, id) < (?, ?)` — the id breaks ties. Same shape, more parameters. |
| **Sorting chosen by the user** — a column-header click that reorders the list | Keeping the cursor across a sort change. It describes a position in the old ordering, so the new listing starts from an arbitrary point. | Treat a sort change exactly like a term change: it is a new query. Reset pagination, and put the sort key in the cursor payload so a mismatched pair restarts instead of seeking. |

**The pattern behind all three:** a cursor is a position inside one specific query. Anything that changes the query — a filter, a term, an ordering — invalidates it. Encode enough of the query in the cursor that the server can tell, because the alternative is a page that is quietly missing rows.

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-data-paginated-list` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> The driver dispatches by method name and accepts an optional base64-encoded JSON request payload (`/test-data-paginated-list <method> <userIds> [<base64-json-request>]`). Response payloads are flattened to summary `key=value` lines. Production recipes should never expose a self-test command.

