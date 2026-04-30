import { createHash } from "crypto";
import { UserGuid, ChannelGuid } from "@rootsdk/server-app";
import { Database, all, get, run, runWithLastID } from "./db";
import { SpamScope } from "@moderation/gen-shared";

// spamDetector — repeated-identical-message detection.
//
// On every eligible message we:
//   1. Hash the normalized content into a stable digest (so the table
//      doesn't carry full message bodies).
//   2. Insert a recent_messages row.
//   3. Count rows in the configured window matching the same hash + user
//      (and same channel for PER_CHANNEL scope).
//   4. If the count meets/exceeds threshold, the message is spam.
//   5. Periodically prune rows older than the largest possible window.
//
// The hash is sha1 of normalized text — collision-resistant enough for
// this purpose, and cheap to compute. We could store the raw text but
// hashing makes the DB row fixed-size and avoids retaining offending
// content longer than necessary.

const HASH_LEN_PREFIX = 32; // first 32 hex chars of sha1; 128 bits is plenty.

export function hashContent(normalizedText: string): string {
  return createHash("sha1")
    .update(normalizedText)
    .digest("hex")
    .slice(0, HASH_LEN_PREFIX);
}

export interface SpamCheckResult {
  isSpam: boolean;
  count: number;
}

// Records the message and returns whether it triggers spam. Atomic-enough:
// the INSERT and COUNT are separate but only the most recent insert can
// raise count above threshold for the same user, and the WHERE clause
// includes the just-inserted row.
export async function recordAndCheck(
  db: Database,
  userId: UserGuid,
  channelId: ChannelGuid,
  contentHash: string,
  now: number,
  windowMs: number,
  threshold: number,
  scope: SpamScope,
): Promise<SpamCheckResult> {
  await runWithLastID(
    db,
    `INSERT INTO recent_messages (user_id, channel_id, content_hash, timestamp)
     VALUES (?, ?, ?, ?)`,
    [userId, channelId, contentHash, now],
  );

  const sinceMs = now - windowMs;
  const params: unknown[] = [userId, contentHash, sinceMs];
  let where = `user_id = ? AND content_hash = ? AND timestamp >= ?`;
  if (scope === SpamScope.PER_CHANNEL) {
    where += ` AND channel_id = ?`;
    params.push(channelId);
  }
  const row = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM recent_messages WHERE ${where}`,
    params,
  );
  const count = row?.n ?? 0;
  return { isSpam: count >= threshold, count };
}

// Drop rows older than the configured window. Called from the daily
// cleanup job and on-demand when the spam window setting shrinks.
export async function prune(db: Database, cutoffMs: number): Promise<void> {
  await run(db, `DELETE FROM recent_messages WHERE timestamp < ?`, [cutoffMs]);
}

export async function clearForUser(
  db: Database,
  userId: UserGuid,
): Promise<void> {
  await run(db, `DELETE FROM recent_messages WHERE user_id = ?`, [userId]);
}
