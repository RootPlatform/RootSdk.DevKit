import { ChannelGuid, UserGuid } from "@rootsdk/server-app";
import { Database, all, run, runWithLastID } from "./db";

// ============================================================================
// awardHistoryStore — append-only XP award log, pruned to 20 per user.
// Table: xp_awards(id, user_id, channel_id, amount, timestamp)
// See DESIGN.md Appendix → Award history. Retains the 20 most recent per member.
// ============================================================================

const MAX_AWARDS_PER_USER = 20;

export interface AwardRow {
  id: number;
  userId: UserGuid;
  channelId: ChannelGuid;
  amount: number;
  timestamp: number;
}

interface AwardDbRow {
  id: number;
  user_id: string;
  channel_id: string;
  amount: number;
  timestamp: number;
}

function toAwardRow(r: AwardDbRow): AwardRow {
  return {
    id: r.id,
    userId: r.user_id as UserGuid,
    channelId: r.channel_id as ChannelGuid,
    amount: r.amount,
    timestamp: r.timestamp,
  };
}

// Record a new award and prune older entries beyond the 20 newest for this user.
// Returns the DB-assigned id of the newly-inserted row so callers can include
// it in event payloads (used as a stable React key on the client).
export async function recordAward(
  db: Database,
  award: Omit<AwardRow, "id">,
): Promise<number> {
  const id = await runWithLastID(
    db,
    `INSERT INTO xp_awards (user_id, channel_id, amount, timestamp) VALUES (?, ?, ?, ?)`,
    [award.userId, award.channelId, award.amount, award.timestamp],
  );

  await run(
    db,
    `
    DELETE FROM xp_awards
    WHERE user_id = ?
      AND id NOT IN (
        SELECT id FROM xp_awards
        WHERE user_id = ?
        ORDER BY timestamp DESC, id DESC
        LIMIT ?
      )
  `,
    [award.userId, award.userId, MAX_AWARDS_PER_USER],
  );

  return id;
}

export async function listRecentAwards(
  db: Database,
  userId: UserGuid,
  limit: number,
): Promise<AwardRow[]> {
  const rows = await all<AwardDbRow>(
    db,
    `
    SELECT id, user_id, channel_id, amount, timestamp
    FROM xp_awards
    WHERE user_id = ?
    ORDER BY timestamp DESC, id DESC
    LIMIT ?
  `,
    [userId, Math.min(limit, MAX_AWARDS_PER_USER)],
  );
  return rows.map(toAwardRow);
}

export async function deleteForUser(db: Database, userId: UserGuid): Promise<void> {
  await run(db, `DELETE FROM xp_awards WHERE user_id = ?`, [userId]);
}

export async function deleteAll(db: Database): Promise<void> {
  await run(db, `DELETE FROM xp_awards`);
}
