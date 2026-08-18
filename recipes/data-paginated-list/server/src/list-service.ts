// ============================================================================
// Recipe: Cursor-Based Pagination — ListService
// SDK: rootServer.dataStore (sqlite3), gen-server abstract base
// ============================================================================
//
// Cursor-based pagination over the `records` table. The lesson:
//
//   1. Cursor, not offset. OFFSET-based pagination shifts under inserts —
//      a row added to page 1 between fetches shows up again on page 2. The
//      cursor here is "the last id you saw"; the next query asks for ids
//      strictly less than that. Page boundaries stay stable as data changes.
//
//   2. Opaque cursor. The wire format is base64-encoded JSON. The client
//      never inspects or constructs cursors — it round-trips whatever the
//      server returned. Server is free to change the encoding (e.g., add a
//      timestamp tiebreaker) without coordinating with clients.
//
//   3. Empty-string-means-end. next_cursor === "" is the canonical "no more
//      pages" signal. One field, one branch in the client state machine.
//      A separate `has_more` boolean would be redundant.
//
//   4. Server caps page_size. A misbehaving or compromised client can't
//      ask for "everything" by sending a huge page_size and skipping
//      pagination entirely.
//
//   5. Filtering happens HERE, not on the client. A paginated response is a
//      window, so a client-side filter over it searches the window rather
//      than the list. That failure is silent — no error, no empty state,
//      correct-looking results — and it only appears once the data outgrows
//      one page, which is long after the code ships.
//
//   6. A cursor belongs to the query that issued it. The cursor payload
//      carries the search term, so a cursor paired with a different term is
//      recognised as stale and the query restarts from the first page
//      instead of seeking into a result set the cursor never described.
//      This is what the opaque-cursor design in (2) buys: the server added
//      a field to the payload and no client had to change.
//
// ============================================================================

import { Client } from "@rootsdk/server-app";
import { ListServiceBase } from "@datapaginatedlist/gen-server";
import {
  ListRecordsRequest,
  ListRecordsResponse,
  Record as RecordMessage,
} from "@datapaginatedlist/gen-shared";
import { all, getDb } from "./db";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface RecordRow {
  id: number;
  created_at: string;
  label: string;
}

export class ListService extends ListServiceBase {
  async listRecords(
    request: ListRecordsRequest,
    _client: Client,
  ): Promise<ListRecordsResponse> {
    // Server-side cap: clamp the requested page size into [1, MAX_PAGE_SIZE].
    // 0 (proto3 default for unset uint32) means "use server default".
    const requested = request.pageSize || DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(Math.max(1, requested), MAX_PAGE_SIZE);

    // Decode the cursor. Empty string = first page (no upper bound on id).
    // Number.MAX_SAFE_INTEGER is the sentinel for "no upper bound" so the
    // SQL stays the same shape on every page; we don't need a separate
    // first-page query.
    // Normalise once: the same string is used for the SQL parameter and for
    // the cursor's fingerprint, so they cannot disagree.
    const search = request.search.trim().toLowerCase();

    // Empty string = first page (no upper bound on id). A cursor issued under
    // a different search term is treated the same way — see decodeCursor.
    const cursorId = decodeCursor(request.cursor, search);

    // Page query. ORDER BY id DESC means newest first. WHERE id < cursorId
    // is the seek; combined with LIMIT, it returns the next page beyond
    // the cursor. id is the PK so this is index-served and cheap regardless
    // of how deep into the list we are — no OFFSET-style "skip and discard"
    // cost as the table grows.
    //
    // We ask for pageSize + 1 and trim the extra to detect end-of-list
    // precisely: if we got <= pageSize rows back, we're done. The cost is
    // one extra row of work per page; the win is no trailing empty page
    // ever reaches the client. (Cheaper alternative: ask for exactly
    // pageSize and infer end from "got fewer than asked"; sacrifices
    // precision — the last full page returns a non-empty cursor that
    // yields [] on the next call. The extra-row variant is the canonical
    // choice for user-facing pagination.)
    // The filter is part of the same query as the seek, so paging walks the
    // matching rows rather than walking every row and discarding non-matches.
    // LOWER(label) LIKE ? is deliberately the plainest thing that works on
    // sqlite and Postgres alike; a real app with a large table wants an index
    // built for the comparison it actually performs (a functional index on
    // LOWER(label), or full-text search), because LIKE '%term%' cannot use a
    // plain B-tree index on label.
    const filterSql = search ? "AND LOWER(label) LIKE ?" : "";
    const params: (number | string)[] = search
      ? [cursorId, `%${search}%`, pageSize + 1]
      : [cursorId, pageSize + 1];

    const rows = await all<RecordRow>(
      getDb(),
      `SELECT id, created_at, label
       FROM records
       WHERE id < ?
       ${filterSql}
       ORDER BY id DESC
       LIMIT ?`,
      params,
    );

    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasMore && pageRows.length > 0
      ? encodeCursor(pageRows[pageRows.length - 1].id, search)
      : "";

    const records: RecordMessage[] = pageRows.map((r) => ({
      id: BigInt(r.id),
      createdAt: r.created_at,
      label: r.label,
    }));

    return { records, nextCursor };
  }
}

export const listService = new ListService();

// --- Cursor encoding --------------------------------------------------------
//
// Base64 of small JSON. Trivial to extend (add fields like a timestamp
// tiebreaker) without changing the wire shape clients see. Decoding any
// malformed cursor falls back to "first page" rather than throwing — clients
// shouldn't be sending malformed cursors, but degrading gracefully beats
// surfacing a hard error to a user who probably can't do anything about it.

interface CursorPayload {
  id: number;
  q: string;
}

function encodeCursor(lastId: number, search: string): string {
  const payload: CursorPayload = { id: lastId, q: search };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

// Returns the seek bound, or MAX_SAFE_INTEGER meaning "start from the first
// page". A cursor whose search term differs from the current request's is
// stale, not malformed: the client changed what it was searching for while
// holding a cursor into the old result set. Restarting is the only correct
// answer — honouring the seek would silently skip every match above it.
// A well-behaved client resets its own pagination on a term change, so this
// is defence in depth rather than the primary mechanism.
function decodeCursor(cursor: string, search: string): number {
  if (!cursor) return Number.MAX_SAFE_INTEGER;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const payload = JSON.parse(json) as CursorPayload;
    const sameQuery = (payload.q ?? "") === search;
    if (sameQuery && typeof payload.id === "number" && Number.isFinite(payload.id)) {
      return payload.id;
    }
  } catch {
    // fallthrough — treat malformed as first-page
  }
  return Number.MAX_SAFE_INTEGER;
}

// `getDb` is called by listRecords. main.ts ensures the database is opened
// before the service is registered, so the call always succeeds at request
// time. No need to thread `db` through the service constructor.
