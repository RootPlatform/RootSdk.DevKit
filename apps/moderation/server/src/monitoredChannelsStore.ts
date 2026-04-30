import { ChannelGuid } from "@rootsdk/server-app";
import { Database, all, run, transaction } from "./db";

// monitoredChannelsStore — list of channel IDs the app monitors. Empty
// means "all channels are monitored" (per design.md "Monitored channels").
//
// In-memory cache populated at startup; the message handler consults it on
// every event. Empty Set means "monitor all" — `isMonitored` returns true
// when the cache is empty, regardless of channel.

export async function listMonitored(db: Database): Promise<ChannelGuid[]> {
  const rows = await all<{ channel_id: string }>(
    db,
    `SELECT channel_id FROM monitored_channels`,
  );
  return rows.map((r) => r.channel_id as ChannelGuid);
}

export async function replaceMonitored(
  db: Database,
  channelIds: ChannelGuid[],
): Promise<void> {
  await transaction(db, async () => {
    await run(db, `DELETE FROM monitored_channels`);
    for (const id of channelIds) {
      await run(
        db,
        `INSERT OR IGNORE INTO monitored_channels (channel_id) VALUES (?)`,
        [id],
      );
    }
  });
  setCache(channelIds);
}

let cache: Set<string> = new Set();
let cacheLoaded = false;

export function isMonitored(channelId: ChannelGuid): boolean {
  if (!cacheLoaded) {
    // Fail-open: until the cache hydrates, treat every channel as monitored.
    // This preserves coverage during the brief startup window before the
    // store finishes loading. Calling code awaits initializeMonitoredCache
    // before subscribing the message handler, so this is defensive only.
    return true;
  }
  if (cache.size === 0) return true;
  return cache.has(channelId);
}

export function setCache(channelIds: ChannelGuid[]): void {
  cache = new Set(channelIds);
  cacheLoaded = true;
}

export async function initializeMonitoredCache(db: Database): Promise<void> {
  setCache(await listMonitored(db));
}
