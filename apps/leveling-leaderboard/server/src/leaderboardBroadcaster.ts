import { getDb } from "./db";
import { getTop } from "./xpStore";
import { getSettings } from "./appSettingsStore";
import { computeLevel } from "./level";
import { log, errFields } from "./lib/log";
import { safeBroadcast } from "./lib/safeBroadcast";
// Circular with leaderboardService, but safe: the reference is only used
// inside deferred callbacks (the chained setTimeout, async broadcastAllReset),
// by which time both modules have fully loaded.
import { leaderboardService } from "./leaderboardService";

// ============================================================================
// leaderboardBroadcaster — coalesced LeaderboardUpdated broadcasts to "all".
//
// Handles ONLY the wide-audience leaderboard snapshot. Per-user MemberXpChanged
// is emitted directly from messageHandler without coalescing. See DESIGN.md.
//
// Coalesce: a 500ms tick checks the dirty flag and broadcasts once if set.
// Caps "all"-audience broadcasts at 2/s regardless of chat volume.
//
// Scheduling uses chained setTimeout rather than setInterval so a slow
// broadcast (e.g., transient SDK back-pressure) can't cause the next tick to
// fire while the previous one is still in flight. Each tick schedules its
// successor only after its own work resolves — broadcasts can never overlap.
// ============================================================================

const COALESCE_INTERVAL_MS = 500;

let dirty = false;
let timer: NodeJS.Timeout | undefined;
let stopped = false;

export function markDirty(): void {
  dirty = true;
}

export function clearDirty(): void {
  dirty = false;
}

export function initializeLeaderboardBroadcaster(): void {
  if (timer || stopped) return;
  scheduleNext();
}

function scheduleNext(): void {
  timer = setTimeout(() => {
    void tick();
  }, COALESCE_INTERVAL_MS);
}

async function tick(): Promise<void> {
  try {
    if (dirty) {
      dirty = false;
      await emitLeaderboardSnapshot(false);
    }
  } catch (err) {
    log("error", "leaderboardBroadcaster tick failed", errFields(err));
  } finally {
    if (!stopped) scheduleNext();
  }
}

// Called directly (bypassing the coalesce tick) from ResetAllXp. Broadcasts
// an empty top-10 with allReset=true so every client clears local state and
// My Stats tabs refetch.
export async function broadcastAllReset(): Promise<void> {
  // Order matters: clearDirty FIRST, then emit. JS is single-threaded so no
  // markDirty() can interleave between these two synchronous lines, and any
  // dirty=true that arrives DURING the emit will correctly schedule a
  // follow-up tick. Reversing the order would re-emit the all-reset snapshot
  // on the next tick if the reset itself marked dirty (it doesn't today,
  // but future code paths shouldn't have to know that).
  clearDirty();
  await emitLeaderboardSnapshot(true);
}

// --- Internal --------------------------------------------------------------

async function emitLeaderboardSnapshot(allReset: boolean): Promise<void> {
  const db = getDb();
  const settings = await getSettings(db);
  const rows = allReset ? [] : await getTop(db, 10);
  const entries = rows.map((row, i) => ({
    userId: row.userId,
    rank: i + 1,
    level: computeLevel(row.totalXp, settings.levelCurveCoefficient),
    totalXp: row.totalXp,
  }));
  await safeBroadcast(`LeaderboardUpdated${allReset ? "(allReset)" : ""}`, () =>
    leaderboardService.broadcastLeaderboardUpdated({ entries, allReset }, "all"),
  );
}
