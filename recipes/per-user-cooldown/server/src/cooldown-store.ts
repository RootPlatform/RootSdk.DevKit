// ============================================================================
// Recipe: Per-User Cooldown — atomic claim store
// SDK: rootServer.dataStore (sqlite3)
// ============================================================================
//
// The whole recipe lives in this one SQL statement:
//
//   INSERT INTO user_cooldowns (user_id, last_claimed_at)
//   VALUES (?, ?)
//   ON CONFLICT(user_id) DO UPDATE
//     SET last_claimed_at = excluded.last_claimed_at
//     WHERE user_cooldowns.last_claimed_at + ? <= excluded.last_claimed_at
//
// Three things make this the right shape:
//
//   1. **Atomic check-and-update.** The "is the user allowed to claim?"
//      check and the "record that they claimed" write happen in one
//      statement. A naive two-step (`SELECT last_claimed_at` then
//      `UPDATE …`) loses to a race: two concurrent claims from the same
//      user both pass the SELECT before either UPDATE runs, and both
//      claims succeed. SQLite serializes statements, so the check+write
//      pair here cannot be split.
//
//   2. **No row branching in app code.** First-claim-ever and
//      Nth-claim collapse into the same statement. INSERT runs when the
//      row doesn't exist; ON CONFLICT runs when it does; the WHERE on
//      the UPDATE is what gates the cooldown.
//
//   3. **`changes` carries the answer.** `db.run` exposes the row count
//      via `this.changes`. INSERT-success → 1. UPDATE-success → 1.
//      UPDATE blocked by the WHERE → 0. Caller branches on that one
//      number; no second SELECT, no exception types.
//
// The `excluded` keyword inside ON CONFLICT refers to the row we tried
// to insert (i.e. the new last_claimed_at). The WHERE compares the
// *existing* row's timestamp + cooldown against that new timestamp;
// only when the cooldown has elapsed does the UPDATE run.
// ============================================================================

import { Database, get, runWithChanges } from "./db";

export interface ClaimSuccess {
  kind: "ok";
  claimedAt: number;
  cooldownEndsAt: number;
}

export interface ClaimRejected {
  kind: "cooldown";
  /** Unix ms — the moment the caller will be allowed to claim again. */
  cooldownEndsAt: number;
}

export type ClaimResult = ClaimSuccess | ClaimRejected;

/**
 * Atomically claim for `userId` if their cooldown has elapsed.
 *
 * `cooldownMs` is the minimum gap between consecutive claims by the
 * same user. `now` is the wall-clock at the moment of the call —
 * passed in (rather than read inside) so the same `now` flows into
 * both the SQL parameters and the response, avoiding millisecond
 * drift in the returned timestamps.
 */
export async function tryClaim(
  db: Database,
  userId: string,
  now: number,
  cooldownMs: number,
): Promise<ClaimResult> {
  // The SQL: insert if the user has never claimed; otherwise update
  // their timestamp ONLY if the cooldown has elapsed. `excluded.x`
  // refers to the would-be-inserted row; `user_cooldowns.x` is the
  // existing row we conflicted with.
  const changes = await runWithChanges(
    db,
    `INSERT INTO user_cooldowns (user_id, last_claimed_at)
     VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE
       SET last_claimed_at = excluded.last_claimed_at
       WHERE user_cooldowns.last_claimed_at + ? <= excluded.last_claimed_at`,
    [userId, now, cooldownMs],
  );

  if (changes === 1) {
    // Either INSERT or qualifying UPDATE ran — the claim is recorded.
    return {
      kind: "ok",
      claimedAt: now,
      cooldownEndsAt: now + cooldownMs,
    };
  }

  // changes === 0: the row exists and the WHERE blocked the update.
  // Read the existing timestamp so we can tell the caller exactly
  // when their cooldown ends. This second statement is on the
  // rejection path only — the hot path is one SQL round-trip.
  //
  // The row MUST exist here — we just observed a conflict on its PK,
  // and the schema has no DELETE path. If `get` returns undefined the
  // schema invariant has been violated; throw rather than synthesise a
  // plausible-looking response, so the bug surfaces loudly.
  const row = await get<{ last_claimed_at: number }>(
    db,
    `SELECT last_claimed_at FROM user_cooldowns WHERE user_id = ?`,
    [userId],
  );
  if (!row) {
    throw new Error(
      `cooldown-store invariant violated: ON CONFLICT fired for user ${userId} ` +
        `but follow-up SELECT found no row`,
    );
  }
  return {
    kind: "cooldown",
    cooldownEndsAt: row.last_claimed_at + cooldownMs,
  };
}
