import { ChannelGuid } from "@rootsdk/server-app";
import { Database, all, run, transaction } from "./db";

// ============================================================================
// excludedChannelsStore — channels that do not earn XP.
// Table: excluded_channels(channel_id TEXT PRIMARY KEY).
// In-memory Set cache used by the message handler's hot path.
// ============================================================================

export async function listExcludedChannels(db: Database): Promise<ChannelGuid[]> {
  const rows = await all<{ channel_id: string }>(
    db,
    `SELECT channel_id FROM excluded_channels`,
  );
  return rows.map((r) => r.channel_id as ChannelGuid);
}

// Replace the excluded set with the given list atomically. Uses a SQLite
// transaction so a crash mid-update never leaves the table partially wiped.
// The in-memory cache is refreshed only after the commit succeeds.
export async function replaceExcludedChannels(
  db: Database,
  channelIds: ChannelGuid[],
): Promise<void> {
  await transaction(db, async () => {
    await run(db, `DELETE FROM excluded_channels`);
    for (const id of channelIds) {
      await run(db, `INSERT OR IGNORE INTO excluded_channels (channel_id) VALUES (?)`, [id]);
    }
  });
  setExcludedCache(channelIds);
}

// --- In-memory cache -------------------------------------------------------

let cache: Set<string> = new Set();

export function isExcluded(channelId: ChannelGuid): boolean {
  return cache.has(channelId);
}

export function setExcludedCache(channelIds: ChannelGuid[]): void {
  cache = new Set(channelIds);
}

export async function initializeExcludedCache(db: Database): Promise<void> {
  const ids = await listExcludedChannels(db);
  setExcludedCache(ids);
}
