import { UserGuid } from "@rootsdk/server-app";
import { Database, get, run, runWithLastID } from "./db";

// rateLimiter — caps how many messages a user can send in a sliding
// window. Mirrors spamDetector but tracks every message, not just
// duplicates.
//
// Hot-path discipline: one INSERT + one COUNT per eligible message. Old
// rows are pruned periodically by the cleanup job.

export interface RateCheckResult {
  isOver: boolean;
  count: number;
}

export async function recordAndCheck(
  db: Database,
  userId: UserGuid,
  now: number,
  windowMs: number,
  maxMessages: number,
): Promise<RateCheckResult> {
  await runWithLastID(
    db,
    `INSERT INTO rate_messages (user_id, timestamp) VALUES (?, ?)`,
    [userId, now],
  );
  const sinceMs = now - windowMs;
  const row = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n
     FROM rate_messages
     WHERE user_id = ? AND timestamp >= ?`,
    [userId, sinceMs],
  );
  const count = row?.n ?? 0;
  return { isOver: count > maxMessages, count };
}

export async function prune(db: Database, cutoffMs: number): Promise<void> {
  await run(db, `DELETE FROM rate_messages WHERE timestamp < ?`, [cutoffMs]);
}
