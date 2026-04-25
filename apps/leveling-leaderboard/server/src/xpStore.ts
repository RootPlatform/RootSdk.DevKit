import { UserGuid } from "@rootsdk/server-app";
import { Database, all, get, run, runWithChanges } from "./db";

// ============================================================================
// xpStore — cumulative XP per member, plus top-N and rank queries.
// Table: xp(user_id TEXT PRIMARY KEY, total_xp INTEGER, last_award_at INTEGER).
// Ordering for ties (DESIGN.md Top 10 leaderboard): ORDER BY total_xp DESC, last_award_at ASC.
// ============================================================================

export interface XpRow {
  userId: UserGuid;
  totalXp: number;
  lastAwardAt: number;
}

export interface RankInfo {
  totalXp: number;
  lastAwardAt: number;
  rank: number;
}

interface XpDbRow {
  user_id: string;
  total_xp: number;
  last_award_at: number;
}

function toXpRow(r: XpDbRow): XpRow {
  return {
    userId: r.user_id as UserGuid,
    totalXp: r.total_xp,
    lastAwardAt: r.last_award_at,
  };
}

// Atomic award-if-cooldown-elapsed. A single SQL statement either:
//   - inserts a new row (first-ever award, no cooldown applies), OR
//   - updates the existing row only when last_award_at + cooldownMs <= now, OR
//   - affects 0 rows (cooldown not yet elapsed).
//
// Returns the updated row on success, undefined when the cooldown blocked the
// award. This closes the TOCTOU race between messageHandler's in-memory
// cooldown check and the DB — two concurrent messages can both pass the cache
// check, but only one satisfies the WHERE clause, so only one awards XP.
export async function addXpIfCooldownElapsed(
  db: Database,
  userId: UserGuid,
  amount: number,
  awardedAt: number,
  cooldownMs: number,
): Promise<XpRow | undefined> {
  const changes = await runWithChanges(
    db,
    `
    INSERT INTO xp (user_id, total_xp, last_award_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      total_xp = total_xp + ?,
      last_award_at = ?
      WHERE last_award_at + ? <= ?
  `,
    [
      userId, amount, awardedAt,
      amount, awardedAt,           // DO UPDATE SET values
      cooldownMs, awardedAt,       // WHERE clause
    ],
  );

  if (changes === 0) return undefined;

  const row = await get<XpDbRow>(db, `SELECT * FROM xp WHERE user_id = ?`, [userId]);
  if (!row) throw new Error("xpStore.addXpIfCooldownElapsed: row missing after upsert");
  return toXpRow(row);
}

export async function getTop(db: Database, limit: number): Promise<XpRow[]> {
  const rows = await all<XpDbRow>(
    db,
    `
    SELECT user_id, total_xp, last_award_at
    FROM xp
    ORDER BY total_xp DESC, last_award_at ASC
    LIMIT ?
  `,
    [limit],
  );
  return rows.map(toXpRow);
}

// Rank is 1-based. Returns undefined when the member has no row.
export async function getRank(
  db: Database,
  userId: UserGuid,
): Promise<RankInfo | undefined> {
  const row = await get<XpDbRow>(db, `SELECT * FROM xp WHERE user_id = ?`, [userId]);
  if (!row) return undefined;

  // Count rows that rank higher (more XP, or tied XP with earlier last_award_at).
  const result = await get<{ rank: number }>(
    db,
    `
    SELECT COUNT(*) + 1 AS rank
    FROM xp
    WHERE total_xp > ?
       OR (total_xp = ? AND last_award_at < ?)
  `,
    [row.total_xp, row.total_xp, row.last_award_at],
  );

  return {
    totalXp: row.total_xp,
    lastAwardAt: row.last_award_at,
    rank: result?.rank ?? 0,
  };
}

export async function resetMember(db: Database, userId: UserGuid): Promise<void> {
  await run(db, `DELETE FROM xp WHERE user_id = ?`, [userId]);
}

export async function resetAll(db: Database): Promise<void> {
  await run(db, `DELETE FROM xp`);
}
