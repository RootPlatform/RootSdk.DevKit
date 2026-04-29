// ============================================================================
// Recipe: App Settings (List Values) — Blocked-terms store
// SDK: SQLite via getDb() / run() / all() / runWithChanges() helpers
// ============================================================================
//
// Persistence layer for the blocked_terms list. Lessons:
//
//   1. SQLite is the right shape for list-of-rows settings. KV would force
//      one of two awkward choices: store the whole list as a single JSON
//      blob (read-modify-write the entire array on every add/remove,
//      concurrent-edit-unsafe) or one key per term (loses the natural
//      "give me the whole list" query and makes ordering by added_at
//      a manual sort). SQLite is a one-liner for both.
//
//   2. UNIQUE + INSERT OR IGNORE = idempotent add. A duplicate add returns
//      `changes = 0` and the existing row stays put — no exception, no
//      check-then-insert race. This is the canonical SQLite idempotency
//      pattern.
//
//   3. Stable per-row identity. The id column is what RemoveBlockedTerm
//      takes as its argument. Without it, the only way to remove a row is
//      by its content (`DELETE WHERE term = ?`), which scales poorly when
//      the row is multi-field and means the client has to round-trip the
//      whole row to delete it. AUTOINCREMENT integer ids are tiny on the
//      wire and stable across renames.
//
//   4. In-memory cache of the full list. Same pattern as the prior recipe
//      in this series — invalidate on every mutation, repopulate from
//      the post-mutation query result, accept the residual race that
//      a truly multi-instance deployment would need a generation counter
//      to close. Single-instance recipes don't see that race in practice.
//
// Validation lives here too. AddBlockedTerm normalises (trim) and checks
// non-empty + length cap before hitting SQLite — putting this in the store
// rather than the service keeps the contract local to the persistence
// layer and gives the service handler a single throw site.
//
// ============================================================================

import { run, runWithChanges, all, getDb } from "./db";

const MAX_TERM_LENGTH = 100;

export interface BlockedTerm {
  id: number;
  term: string;
  added_at: string;
}

/** Indicates the requested term failed validation. The service maps this
 *  to BlockedTermsError.INVALID_TERM via RootServerException. */
export class InvalidTermError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTermError";
  }
}

let cache: BlockedTerm[] | undefined;

/** Read the full list. Cheap on the hot path — returns from cache when
 *  populated, hydrates from SQLite on first call / after invalidation. */
export async function listTerms(): Promise<BlockedTerm[]> {
  if (cache) return cache.slice();
  const rows = await all<BlockedTerm>(
    getDb(),
    `SELECT id, term, added_at FROM blocked_terms ORDER BY added_at DESC, id DESC`,
  );
  cache = rows;
  return rows.slice();
}

/**
 * Add a term. Normalises (trim) and validates (non-empty, length cap)
 * before insertion. INSERT OR IGNORE makes the operation idempotent on
 * the UNIQUE term constraint: a second add of the same term is a no-op
 * that returns the original row's id on the next list query.
 *
 * Returns the full updated list so the caller can pass it straight back
 * to the client without a separate refetch.
 */
export async function addTerm(rawTerm: string): Promise<BlockedTerm[]> {
  const term = rawTerm.trim();
  if (term.length === 0) {
    throw new InvalidTermError("Term must not be empty");
  }
  if (term.length > MAX_TERM_LENGTH) {
    throw new InvalidTermError(
      `Term must be ${MAX_TERM_LENGTH} characters or fewer`,
    );
  }

  const db = getDb();
  const addedAt = new Date().toISOString();
  await run(
    db,
    `INSERT OR IGNORE INTO blocked_terms (term, added_at) VALUES (?, ?)`,
    [term, addedAt],
  );
  return refreshCache();
}

/**
 * Remove a term by id. Idempotent: removing an id that no longer exists
 * returns the unchanged list. Returns the full updated list for the same
 * reason as addTerm.
 */
export async function removeTerm(id: number): Promise<BlockedTerm[]> {
  await runWithChanges(
    getDb(),
    `DELETE FROM blocked_terms WHERE id = ?`,
    [id],
  );
  return refreshCache();
}

// --- Helpers ----------------------------------------------------------------

/**
 * Drop the cache and re-read. Called from the mutation paths so the next
 * listTerms() returns the post-mutation state. Always runs a fresh SELECT
 * rather than building the new state from the prior cache + the diff —
 * one round trip and we're certain the cache reflects what's actually
 * persisted, including any concurrent writes that landed between our
 * INSERT and our refresh.
 *
 * Within-instance pile-up: two concurrent mutations both hit this path,
 * both clear the cache, both run the SELECT. Each subsequent listTerms()
 * call picks up whichever SELECT resolved last — correct (both reads are
 * post-INSERT-OR-IGNORE) but does double the read work. Single-instance
 * recipes rarely see meaningful contention; if your fork sees enough
 * concurrent admin writes for this to matter, gate refreshCache with an
 * in-flight promise (return the existing one if a refresh is already
 * running). Same residual cross-instance race as the prior recipe in this
 * series — out of scope for the recipe.
 */
async function refreshCache(): Promise<BlockedTerm[]> {
  cache = undefined;
  return listTerms();
}
