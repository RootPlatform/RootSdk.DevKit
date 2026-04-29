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
    const cursorId = decodeCursor(request.cursor);

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
    const rows = await all<RecordRow>(
      getDb(),
      `SELECT id, created_at, label
       FROM records
       WHERE id < ?
       ORDER BY id DESC
       LIMIT ?`,
      [cursorId, pageSize + 1],
    );

    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasMore && pageRows.length > 0
      ? encodeCursor(pageRows[pageRows.length - 1].id)
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
}

function encodeCursor(lastId: number): string {
  const payload: CursorPayload = { id: lastId };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decodeCursor(cursor: string): number {
  if (!cursor) return Number.MAX_SAFE_INTEGER;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const payload = JSON.parse(json) as CursorPayload;
    if (typeof payload.id === "number" && Number.isFinite(payload.id)) {
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
