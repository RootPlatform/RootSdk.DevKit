// warningCooldown — debounces public warning posts per `(userId, channelId)`
// pair. The audit row is always written; this only suppresses the visible
// channel post when one user violates rapidly.
//
// Without the cooldown, a user posting 20 banned messages in quick
// succession would generate 20 warning posts in the channel — each an
// "@user, your message was removed" notice — flooding the channel and
// drowning real conversation. The cooldown collapses bursts to a single
// notice every WINDOW_MS per channel.
//
// Per-channel scope: a different channel gets an independent cooldown.
// Different user, same channel = independent cooldown. So one chatty
// admin's warnings never gate another user's.
//
// Memory bounding: a periodic sweep drops expired entries; an LRU cap
// drops the oldest touched entry past MAX_ENTRIES. Same shape as
// nicknameCache. The map size is bounded by concurrent-violator-channel
// pairs, which in practice is small.

import { ChannelGuid, UserGuid } from "@rootsdk/server-app";

const WINDOW_MS = 10 * 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_ENTRIES = 5_000;

const lastPostedAt = new Map<string, number>();
let sweepTimer: ReturnType<typeof setInterval> | undefined;

export function initializeWarningCooldown(): void {
  sweepTimer = setInterval(sweepExpired, SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
}

function key(userId: UserGuid, channelId: ChannelGuid): string {
  return `${userId}:${channelId}`;
}

// Returns true if a warning post is allowed (no recent post in this
// user/channel pair). Caller is responsible for calling markPosted on a
// successful post — keeping the gate + the marker as separate calls means
// we don't mark a cooldown for a post that ultimately failed to send.
export function shouldPostWarning(
  userId: UserGuid,
  channelId: ChannelGuid,
): boolean {
  const last = lastPostedAt.get(key(userId, channelId));
  if (last === undefined) return true;
  return Date.now() - last >= WINDOW_MS;
}

export function markPosted(userId: UserGuid, channelId: ChannelGuid): void {
  const k = key(userId, channelId);
  // Re-insert (delete + set) so this entry moves to the end of the Map's
  // iteration order. Combined with the LRU cap below, the first key is
  // the least-recently-touched and gets dropped on overflow.
  lastPostedAt.delete(k);
  lastPostedAt.set(k, Date.now());
  if (lastPostedAt.size > MAX_ENTRIES) {
    const oldest = lastPostedAt.keys().next().value;
    if (oldest !== undefined) lastPostedAt.delete(oldest);
  }
}

function sweepExpired(): void {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [k, ts] of lastPostedAt) {
    if (ts < cutoff) lastPostedAt.delete(k);
  }
}
