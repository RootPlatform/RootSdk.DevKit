import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  RootGuidUtils,
  RootGuidType,
  UserGuid,
} from "@rootsdk/server-app";
import { Database, getDb, transaction } from "./db";
import { getSettings } from "./appSettingsStore";
import { isEligible } from "./xpEligibleGroup";
import { isExcluded } from "./excludedChannelsStore";
import { addXpIfCooldownElapsed, getRank, getTop } from "./xpStore";
import { recordAward } from "./awardHistoryStore";
import { markDirty } from "./leaderboardBroadcaster";
import { computeLevel, progressToNextLevel } from "./level";
import { leaderboardService } from "./leaderboardService";
import { getChannelName } from "./channelNameCache";
import { log, errFields } from "./lib/log";
import { safeBroadcast } from "./lib/safeBroadcast";

// ============================================================================
// messageHandler — awards XP for eligible messages.
//
// Flow per DESIGN.md Appendix → How XP is awarded:
//   1. Skip system messages and non-user senders (apps, bots).
//   2. Enforce channel-exclusion, eligibility, and cooldown filters.
//   3. Upsert XP total, record the award, prune history to 20 per user.
//   4. Broadcast MemberXpChanged to "all" (clients filter by userId; see
//      DESIGN.md "Why MemberXpChanged uses 'all'").
//   5. If the award affects the top 10, markDirty() to schedule a coalesced
//      LeaderboardUpdated broadcast.
//
// Hot-path discipline: no SDK calls after the cooldown check. Channel names
// come from the in-memory cache. Every SDK call in the startup path is wrapped
// in withRetry (see channelNameCache and adminCheck).
// ============================================================================

// In-memory cooldown cache — a PERFORMANCE optimization, not a correctness
// primitive. The atomic SQL in addXpIfCooldownElapsed is the source of truth:
// its WHERE clause enforces the cooldown per message. The cache just lets us
// skip the DB write when we already know the user is in cooldown.
//
// The cache is safely stale: a hit that says "in cooldown" skips the DB and
// is always correct (DB would agree). A miss or a "not in cooldown" hit goes
// to the DB, which makes the final decision. Under concurrent messages from
// the same user, both may pass the cache check, but only one will satisfy the
// DB's WHERE and actually award.
//
// TTL eviction: a periodic timer drops entries older than `2 × max cooldown`.
// Without this the cache grows unboundedly with every-ever-active user — fine
// at community scale but a silent leak when a fork is deployed with millions
// of users. The eviction window is generous (2× the largest cooldown) so an
// active user's entry never expires between their messages; entries that DO
// get evicted just trigger a DB read on the user's next message, which the
// atomic SQL handles correctly.
const lastAwardByUser = new Map<UserGuid, number>();
const COOLDOWN_CACHE_SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 min
let cooldownSweepTimer: NodeJS.Timeout | undefined;

// Must be called after ResetMemberXp — otherwise the user's stale cache entry
// would block them from earning XP until `cooldownSeconds` naturally elapsed
// from a timestamp whose source row no longer exists in the DB.
export function clearCooldownFor(userId: UserGuid): void {
  lastAwardByUser.delete(userId);
}

// Must be called after ResetAllXp for the same reason.
export function clearAllCooldowns(): void {
  lastAwardByUser.clear();
}

export function initializeMessageHandler(): void {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    (evt) => {
      void onMessage(evt).catch((err) => {
        log("error", "messageHandler.onMessage failed", {
          userId: evt.userId,
          channelId: evt.channelId,
          ...errFields(err),
        });
      });
    },
  );
  startCooldownCacheSweeper();
}

// Periodic eviction of stale cooldown cache entries. Read settings each tick
// so the eviction window tracks the current cooldown if an admin changes it.
// The timer is process-lifetime; not unref'd because dropping the sweep would
// leak under sustained load.
function startCooldownCacheSweeper(): void {
  if (cooldownSweepTimer) return;
  cooldownSweepTimer = setInterval(() => {
    void sweepCooldownCache().catch((err) =>
      log("error", "cooldown cache sweep failed", errFields(err)),
    );
  }, COOLDOWN_CACHE_SWEEP_INTERVAL_MS);
}

async function sweepCooldownCache(): Promise<void> {
  const settings = await getSettings(getDb());
  const cutoff = Date.now() - 2 * settings.cooldownSeconds * 1000;
  let evicted = 0;
  for (const [userId, ts] of lastAwardByUser) {
    if (ts < cutoff) {
      lastAwardByUser.delete(userId);
      evicted++;
    }
  }
  if (evicted > 0) {
    log("debug", "cooldown cache evicted", {
      evicted,
      remaining: lastAwardByUser.size,
    });
  }
}

async function onMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  const db = getDb();

  // Filter out system messages and non-user senders (apps / bots).
  if (evt.messageType === MessageType.System) return;
  // RootGuidType.Person = humans; .App = bots/apps. Only humans earn XP.
  if (RootGuidUtils.toRootGuidType(evt.userId) !== RootGuidType.Person) return;

  // Channel exclusion (cheap in-memory Set check).
  if (isExcluded(evt.channelId)) return;

  // Eligibility per the app's xpEligible MemberGroup. Synchronous — the
  // resolved membership is an in-memory Set maintained by the platform.
  if (!isEligible(evt.userId)) return;

  const settings = await getSettings(db);
  const now = Date.now();
  const cooldownMs = settings.cooldownSeconds * 1000;

  // Fast-path cache check: if we recently awarded this user, skip the DB write.
  // This is a performance optimization; the atomic SQL below is authoritative.
  const cached = lastAwardByUser.get(evt.userId);
  if (cached !== undefined && now - cached < cooldownMs) return;

  // Award XP + record the award history row in a single transaction so a
  // crash between the two writes can't leave total_xp incremented with a
  // missing history entry. The atomic SQL in addXpIfCooldownElapsed handles
  // the cooldown race by itself (its WHERE clause blocks double-awards),
  // and the transaction then folds in the history insert atomically.
  const result = await transaction(db, async () => {
    const row = await addXpIfCooldownElapsed(
      db,
      evt.userId,
      settings.xpPerMessage,
      now,
      cooldownMs,
    );
    if (!row) return undefined;
    const awardId = await recordAward(db, {
      userId: evt.userId,
      channelId: evt.channelId,
      amount: settings.xpPerMessage,
      timestamp: now,
    });
    return { row, awardId };
  });
  if (!result) return;
  const { row: updated, awardId } = result;
  lastAwardByUser.set(evt.userId, now);

  // MemberXpChanged broadcast to the "all" audience. Every connected client
  // receives every event; each client filters for `event.userId ===
  // currentUserId` to decide if it's theirs. See DESIGN.md "Broadcasts" for
  // the rationale — briefly, targeted `Client[]` delivery depends on
  // `rootServer.clients.getClient(userId)` returning truthy, which requires
  // the user to be currently attached to our app's channel. Users who've
  // backgrounded our app (to visit another channel, typically) won't be in
  // the clients map, so their targeted broadcast silently drops. "all"
  // sidesteps the gap at the cost of N× fan-out; acceptable at community
  // scale for this sample.
  const rankInfo = await getRank(db, evt.userId);
  const level = computeLevel(updated.totalXp, settings.levelCurveCoefficient);
  const progress = progressToNextLevel(updated.totalXp, settings.levelCurveCoefficient);

  // Broadcast failures are logged but never interrupt the message handler —
  // the award already committed to the DB, and clients will catch up on next
  // fetch. Dropping a single real-time update is preferable to double-writing
  // or surfacing a broadcast error to an unrelated flow.
  await safeBroadcast("MemberXpChanged", () =>
    leaderboardService.broadcastMemberXpChanged(
      {
        userId: evt.userId,
        totalXp: updated.totalXp,
        level,
        rank: rankInfo?.rank ?? 0,
        progressToNextLevel: progress,
        award: {
          // Proto AwardEntry.id is int64 → bigint. The DB id is a JS number
          // from sqlite3's lastID (safely under 2^53 for any realistic table).
          id: BigInt(awardId),
          channelId: evt.channelId,
          channelName: getChannelName(evt.channelId),
          // Proto AwardEntry.timestamp is int64 → generates as bigint in TS.
          // Our in-memory `now` is a Date.now() number; safe to widen
          // (ms timestamps are well under 2^53).
          timestamp: BigInt(now),
          amount: settings.xpPerMessage,
        },
      },
      "all",
    ),
  );

  // Mark leaderboard dirty if this award affects the top 10.
  if (await affectsTop10(db, evt.userId, updated.totalXp)) {
    markDirty();
  }
}

// Cheap check before marking the leaderboard dirty — the award affects the
// top 10 if the earner is already in it, the board isn't yet full, or the
// earner's new total exceeds the current #10.
//
// Production-fork notes:
//   * This runs an indexed SELECT on every eligible message. Cheap
//     individually, but at very high message rates it compounds with the
//     other per-message DB reads (settings, cooldown upsert, history
//     insert, getRank for the broadcast). A cached top-10 snapshot
//     invalidated only on write would eliminate this read.
//   * The earner's rank is computed separately above via getRank (a COUNT
//     query over the xp table). When the earner turns out to be in the top
//     10 here, their rank is `index + 1` in this array, so a fork can fold
//     the two calls into one: run getTop(10) first, derive rank from the
//     array when the earner is in it, and only fall back to getRank when
//     they're off-board. That saves the COUNT query on every in-board
//     earn, which is the common case for active communities.
async function affectsTop10(
  db: Database,
  userId: UserGuid,
  newTotalXp: number,
): Promise<boolean> {
  const top = await getTop(db, 10);
  if (top.some((r) => r.userId === userId)) return true;
  if (top.length < 10) return true;
  return newTotalXp > top[9].totalXp;
}
