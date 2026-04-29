// ============================================================================
// Recipe: Batch-Prefetch Related Data — Activity + Owner store
// SDK: SQLite via getDb() / all() helpers
// ============================================================================
//
// Two operations:
//
//   listActivities()              — returns all rows, newest first.
//   batchGetOwners(ids[])         — returns a Map<id, OwnerInfo> populated
//                                   from a SINGLE parameterized query.
//
// The whole point of this recipe is the second function. Two things matter:
//
//   1. Parameterized IN-list. The SQL is `WHERE id IN (?, ?, ?, …)` with one
//      `?` per id. NEVER string-interpolate ids into the query —
//      `WHERE id IN (${ids.join(",")})` is a textbook SQL injection. The
//      parameter array length is dynamic, but the placeholders match it
//      one-to-one. SQLite has a default `SQLITE_MAX_VARIABLE_NUMBER` of
//      999 (raised to 32766 in newer builds); for clients that might send
//      more ids than that, the recipe would chunk the input. Out of scope
//      for the toy data here (max 5 distinct ids).
//
//   2. Map-shaped return. The proto's `map<string, OwnerInfo>` lands as
//      an index-signature object on both the wire and the TS side. We
//      build it by iterating the SQL result and assigning by id. Missing
//      ids are simply absent from the map — the contract is "ask for
//      these, get back whatever exists." Clients render absent ids as
//      "(unknown)" rather than treating absence as an error.
//
// No cache here. The recipe deliberately re-queries on every batch call
// to keep the lesson focused on the SQL pattern. A real app might cache
// owners with a short TTL (see future external-cache-with-ttl recipe);
// the client also caches resolved owners across activity-list refreshes.
// ============================================================================

import { all, getDb } from "./db";

export interface Activity {
  id: number;
  action: string;
  actor_id: string;
  occurred_at: string;
}

export interface OwnerInfo {
  id: string;
  display_name: string;
  color: string;
}

interface ActivityRow extends Activity {}

interface OwnerRow extends OwnerInfo {}

/** Read all activities, newest first. */
export async function listActivities(): Promise<Activity[]> {
  return all<ActivityRow>(
    getDb(),
    `SELECT id, action, actor_id, occurred_at
     FROM activities
     ORDER BY occurred_at DESC, id DESC`,
  );
}

/**
 * Resolve a list of owner ids to their full records in one round trip.
 *
 * Returns a Map keyed by id. Missing ids simply don't appear in the map —
 * the caller (the service handler) converts the Map to the proto's
 * `map<string, OwnerInfo>` field, and clients see absence as "unknown".
 *
 * Empty input short-circuits — no need to issue an empty `IN ()` query
 * (which is a syntax error in SQLite anyway).
 */
export async function batchGetOwners(
  ids: string[],
): Promise<Map<string, OwnerInfo>> {
  const result = new Map<string, OwnerInfo>();
  if (ids.length === 0) return result;

  // Build the placeholder list to match the input array length, then run
  // the parameterized query. The placeholders and the params array stay
  // in lockstep: N ids → N `?`s → N values bound to those positions. No
  // string concatenation of user-supplied data into the SQL.
  const placeholders = ids.map(() => "?").join(", ");
  const sql = `
    SELECT id, display_name, color
    FROM owners
    WHERE id IN (${placeholders})
  `;
  const rows = await all<OwnerRow>(getDb(), sql, ids);

  for (const row of rows) {
    result.set(row.id, {
      id: row.id,
      display_name: row.display_name,
      color: row.color,
    });
  }
  return result;
}
