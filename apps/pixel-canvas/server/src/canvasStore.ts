import {
  rootServer,
  RootServerException,
  UserGuid,
} from "@rootsdk/server-app";
import { PixelCanvasError } from "@pixelcanvas/gen-shared";
import { withRetry } from "./lib/retry";
import { log } from "./lib/log";

// ============================================================================
// canvasStore — pixel state + per-user cooldown.
//
// Two stores in this module:
//
//   1. CANVAS state (KV) — a sparse map of placed pixels keyed by "x,y".
//      Stored at KV key "canvas". Sparse format means cleared/never-
//      placed cells are absent from the map; the client renders absent
//      cells as a neutral background. A maxed-out 64×64 fully painted
//      canvas is ~320 KB serialized — comfortably within KV's small-
//      blob zone, but at the larger end.
//
//   2. PER-USER COOLDOWN map (in-memory only) — userId → lastPlacedAtMs.
//      The atomic-style check-then-place pattern in placePixelIfCooldownElapsed
//      is the source of truth; this map is a perf optimization that lets
//      us short-circuit cooldown checks without hitting the KV. Same shape
//      as leveling-leaderboard's lastAwardByUser. Lost on restart, which
//      is acceptable: at restart everyone gets one "free" placement before
//      their cooldown re-establishes.
//
// In-memory cache for the canvas state itself: hydrated at initialize, kept
// in sync after every successful write. readCanvas() returns the live
// reference (not a clone) — callers must treat it as immutable.
//
// CONCURRENCY MODEL — two distinct races to defend against:
//
//   (a) Same-user TOCTOU on cooldown:
//       Without care, an `await` between the cooldown READ and the cooldown
//       UPDATE lets a second concurrent request from the same user pass the
//       check before the first one's update lands. Fan-out N parallel
//       PlacePixel RPCs from one client and you'd bypass cooldown entirely.
//       Fix: claim the cooldown slot SYNCHRONOUSLY (cooldown.set before any
//       await) with rollback on KV failure.
//
//   (b) Different-user blob race:
//       Two PlacePixels for distinct users each read `cache = C0`, build
//       different `next` values that BOTH derive from C0 (so each excludes
//       the other's pixel), and write them sequentially to KV. Last-write-
//       wins drops one pixel from KV — even though both placers (and all
//       connected clients) saw the broadcast and updated locally. The
//       missing pixel reappears as "vanished" on the next refresh / server
//       restart.
//       Fix: serialize all canvas KV writes through a single in-process
//       Promise chain (`canvasWriteLock`). The work runs under the lock
//       reads the LATEST `cache` (post-prior-commit) before building
//       `next`, so each placement / clear composes with everything that
//       landed before it.
//
// JS's single-threaded event loop is what makes the synchronous claim in
// (a) possible — but it does NOT serialize across `await` boundaries. The
// queue in (b) provides that explicit serialization for KV writes.
//
// Commit-but-reported-failure recovery: writeValue can complete the
// storage commit and have the SDK report failure on the response
// (timeout after commit). In that case KV holds the new state but our
// in-memory `cache` still holds the pre-write state. Without
// intervention, the next serialized write would compose against the
// stale `cache` and overwrite KV with the older snapshot. Defense:
// `refreshCacheFromKv` runs inside the failure path of every serialized
// write so subsequent queued work picks up authoritative state.
//
// The placement-side path also uses the refreshed cache to detect
// whether ITS write committed — checking for the exact (color, userId,
// placedAt) triple — and if so, returns success rather than rolling
// back. This avoids the prior "user gets a generic error AND the pixel
// is invisible to others until their next GetCanvas" failure mode.
//
// If refresh itself exhausts retries, `cacheNeedsRefresh` is set; the
// next queued write retries the refresh once more and aborts the
// operation if it still can't recover. Better to fail one placement
// loudly than to silently corrupt KV by writing back stale state.
//
// Single-process assumption: this whole scheme works because there's exactly
// one server instance. README "Known limits" makes that explicit. A multi-
// process deployment would need a real distributed lock (or the KV layer
// would need optimistic-concurrency / CAS primitives we don't currently use).
// ============================================================================

const KV_KEY_CANVAS = "canvas";

export interface PixelData {
  color: string;
  userId: UserGuid;
  placedAt: number;
}

export interface CanvasState {
  width: number;
  height: number;
  // Keyed by `${x},${y}`. Sparse — only placed pixels appear.
  pixels: Record<string, PixelData>;
}

const cooldown = new Map<UserGuid, number>();
let cache: CanvasState | undefined;
// Set when refreshCacheFromKv exhausts retries — `cache` is no longer
// authoritative, and any subsequent write that composes against it
// would write back stale state. Cleared on the next successful refresh.
// Inside the serialization queue's work, we check this flag first; if
// set, we attempt one more refresh, and if that also fails we throw
// (better to fail the operation than silently corrupt state).
let cacheNeedsRefresh = false;

// Periodically evict stale cooldown entries. Without this, the map grows
// monotonically with the number of distinct users who ever placed a
// pixel — fine at sample scale (~30B per UserGuid + ~16B per timestamp,
// so ~5MB at 100K lifetime members), but a long-tail community fork
// should not be implicitly trusting a Map to retain every member's
// timestamp forever.
//
// Once a user's last placement is older than the maximum allowed cooldown
// (which the service enforces — see COOLDOWN_SECONDS_MAX in
// pixelCanvasService.ts), their cooldown is definitely elapsed under any
// legal setting, and removing the entry is observably equivalent to
// leaving it (their next placement reads `cooldown.get(userId) ?? 0` →
// either 0 or a long-elapsed timestamp — both pass the cooldown check).
// `sweepStaleCooldowns(retentionMs)` is called by the service on a timer
// with a generous retention to avoid evicting active users whose
// cooldown is still ticking.
export function sweepStaleCooldowns(retentionMs: number): void {
  const now = Date.now();
  for (const [userId, last] of cooldown) {
    if (now - last > retentionMs) cooldown.delete(userId);
  }
}

// Serialization queue for canvas KV writes. Every mutation that reads-modifies-
// writes the canvas blob (`placePixelIfCooldownElapsed`, `clearCanvas`)
// chains through here so concurrent calls don't compose against the same
// stale snapshot. Errors don't block the chain — the `.catch(() => undefined)`
// below strips rejection off `canvasWriteLock` so a failed write doesn't
// poison subsequent callers; each caller still observes its own work's
// outcome via the returned Promise.
let canvasWriteLock: Promise<unknown> = Promise.resolve();

function serializeCanvasWrite<T>(work: () => Promise<T>): Promise<T> {
  // The lock-replacement on the next line strips rejections off the
  // chain, so canvasWriteLock can never reject. A failed write is
  // observable to its own caller via the returned Promise, but doesn't
  // poison the queue for subsequent callers.
  const next = canvasWriteLock.then(work);
  canvasWriteLock = next.catch(() => undefined);
  return next;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

export async function initializeCanvasStore(initialSize: number): Promise<void> {
  const stored = await withRetry("canvasStore.get", () =>
    rootServer.dataStore.appData.get<CanvasState>(KV_KEY_CANVAS),
  );
  if (stored && stored.width > 0 && stored.height > 0) {
    cache = stored;
  } else {
    // First-run path: write an empty canvas of the configured initial size.
    const initial: CanvasState = { width: initialSize, height: initialSize, pixels: {} };
    await writeValue(initial);
    cache = initial;
    log("info", "canvas initialized", { width: initialSize, height: initialSize });
  }
}

// Write a specific snapshot of canvas state to KV. The caller passes the
// value explicitly (rather than reading the live `cache` ref) so a retry
// loop inside withRetry can't pick up a value that was reassigned by an
// unrelated writer between attempts. The in-memory `cache` is updated by
// the caller AFTER this resolves successfully.
async function writeValue(value: CanvasState): Promise<void> {
  await withRetry("canvasStore.set", () =>
    rootServer.dataStore.appData.set({ key: KV_KEY_CANVAS, value }),
  );
}

export function readCanvas(): CanvasState {
  if (!cache) {
    throw new Error(
      "canvasStore not initialized — call initializeCanvasStore() in onStarting",
    );
  }
  return cache;
}

export function getLastPlacedAt(userId: UserGuid): number {
  return cooldown.get(userId) ?? 0;
}

// Discriminated union return from placePixelIfCooldownElapsed.
//
// `kind: "ok"` — placement landed; `placedAt` is the server-authoritative
// timestamp (the same `now` that was used as the cooldown anchor).
//
// `kind: "cooldown"` — cooldown hasn't elapsed; `remainingMs` was computed
// from the same `now` value the caller passed in, so the message the
// service shows to the user can't drift from the math the cooldown check
// itself used. The earlier shape returned `undefined` and required the
// service layer to recompute remainingMs via `getLastPlacedAt(userId)` —
// two independent reads against the same logical "right now" was easy to
// get wrong on a refactor.
export type PlaceOutcome =
  | { kind: "ok"; placedAt: number }
  | { kind: "cooldown"; remainingMs: number };

// Atomic check-then-place. Returns the discriminated outcome above. May
// throw RootServerException(INVALID_COORDINATES) if the bounds re-check
// inside the queue fails (admin shrunk the canvas while this placement
// was queued); also throws if the cache is in a known-stale state and a
// recovery refresh fails.
//
// Two-phase design:
//
//   1. Synchronous cooldown CLAIM (before any await). This closes the
//      same-user TOCTOU window — see header comment, race (a). A failure
//      after the claim must roll the cooldown back so the user isn't
//      locked for placements that never persisted.
//
//   2. Serialized canvas WRITE (under canvasWriteLock). This closes the
//      blob-race window — see header comment, race (b). The work re-reads
//      `cache` inside the lock so it composes against any prior write
//      that just landed.
//
// Commit-but-reported-failure detection: if writeValue throws, we refresh
// from KV and check whether our exact placement (color + userId +
// placedAt triple) is in there. If yes, the storage layer accepted the
// write but the SDK reported a transient failure on the response — treat
// as success so the user's cooldown stays claimed and the caller fires
// the broadcast. If the placement isn't in KV, propagate the error and
// let the outer catch roll back the cooldown.
export async function placePixelIfCooldownElapsed(
  userId: UserGuid,
  x: number,
  y: number,
  color: string,
  cooldownMs: number,
  now: number,
): Promise<PlaceOutcome> {
  if (!cache) throw new Error("canvasStore not initialized");

  // Phase 1: cooldown check + synchronous claim. The cooldown.get read
  // and the cooldown.set claim happen with no await between them, so
  // JS's single-threaded execution guarantees no other handler sees the
  // intermediate "checked but not yet claimed" state. We capture the
  // raw (possibly-undefined) prior value once and reuse it for both the
  // elapsed check (via `?? 0`) and the rollback path below — a second
  // cooldown.get would be redundant.
  const previousCooldown = cooldown.get(userId);
  const last = previousCooldown ?? 0;
  if (now - last < cooldownMs) {
    return { kind: "cooldown", remainingMs: cooldownMs - (now - last) };
  }
  cooldown.set(userId, now);

  // Phase 2: serialized canvas write. On any failure (other than the
  // commit-detected-via-refresh case), roll the cooldown back so the
  // user can retry — leaving the claim in place would let a KV outage
  // permanently lock everyone out for a cooldown window.
  try {
    return await serializeCanvasWrite(async () => {
      // If a previous refresh exhausted retries, `cache` is known stale.
      // Try once more inside the lock; if it still fails, throw rather
      // than write back a stale composition.
      if (cacheNeedsRefresh) {
        await refreshCacheFromKv();
        if (cacheNeedsRefresh) {
          throw new Error(
            "canvasStore cache is stale and refresh failed — placement aborted",
          );
        }
      }
      if (!cache) throw new Error("canvasStore not initialized");
      // Re-validate bounds against the (possibly resized) current cache —
      // an admin could have shrunk the canvas while we were queued behind
      // a clear/resize. Without this, a pixel could land out of bounds in
      // the KV blob.
      if (x < 0 || x >= cache.width || y < 0 || y >= cache.height) {
        throw new RootServerException(
          PixelCanvasError.INVALID_COORDINATES,
          `(${x}, ${y}) is outside the ${cache.width}×${cache.height} canvas`,
        );
      }
      const k = key(x, y);
      const placement: PixelData = { color, userId, placedAt: now };
      const next: CanvasState = {
        width: cache.width,
        height: cache.height,
        // Shallow-copy the pixels map so we don't mutate the live cache.
        // The map fits in ~320KB at max canvas + full paint; copy cost is
        // negligible compared to the KV roundtrip. Deep-copying individual
        // PixelData entries isn't needed — they're treated as immutable.
        pixels: { ...cache.pixels, [k]: placement },
      };
      try {
        await writeValue(next);
        cache = next;
        return { kind: "ok" as const, placedAt: now };
      } catch (writeErr) {
        // Defensive cache refresh: writeValue may have actually committed
        // server-side but reported failure (e.g., the SDK request timed
        // out *after* the storage layer accepted the write). Refresh from
        // KV, then check whether our exact placement is in there. If yes,
        // the write succeeded — treat as success. If no, propagate the
        // error so the outer catch rolls back the cooldown.
        await refreshCacheFromKv();
        if (cache) {
          const after = cache.pixels[k];
          if (
            after &&
            after.color === placement.color &&
            after.userId === placement.userId &&
            after.placedAt === placement.placedAt
          ) {
            return { kind: "ok" as const, placedAt: now };
          }
        }
        throw writeErr;
      }
    });
  } catch (err) {
    if (previousCooldown === undefined) cooldown.delete(userId);
    else cooldown.set(userId, previousCooldown);
    throw err;
  }
}

// Clear the canvas (admin action) and optionally resize. Resizing always
// clears — preserving pixels through a resize would mean either truncating
// (silent data loss) or padding (visual jump). Both are confusing; clearing
// is honest. Cooldown map is left intact — admins who clear shouldn't reset
// every member's cooldown timer (a coordinated "everyone race for the new
// canvas" effect would also be unfair to users mid-cooldown when the clear
// happened).
//
// Goes through canvasWriteLock so a clear can't interleave with placements
// in flight — without that, a placement that was queued behind a clear
// would re-introduce a pixel we just wiped (or land outside the new
// bounds). Inside the lock we re-read `cache` for the same reason.
export async function clearCanvas(newSize?: number): Promise<CanvasState> {
  return serializeCanvasWrite(async () => {
    if (!cache) throw new Error("canvasStore not initialized");
    const size = newSize ?? cache.width;
    const next: CanvasState = { width: size, height: size, pixels: {} };
    try {
      await writeValue(next);
      cache = next;
      return cache;
    } catch (err) {
      // Same defensive cache refresh as placePixelIfCooldownElapsed —
      // see that function's comment for rationale. A clear that
      // committed-but-reported-failure followed by a placement composing
      // against a stale `cache` would bring back pixels we just wiped.
      await refreshCacheFromKv();
      throw err;
    }
  });
}

// Re-read the canvas blob from KV and update the in-memory cache. Used
// from inside the serialization queue's failure path when writeValue's
// reported error doesn't tell us whether the storage layer actually
// committed, and at the start of each queued write when a previous
// refresh failed (cacheNeedsRefresh).
//
// Goes through withRetry like every other KV access in this file. On
// success the `cacheNeedsRefresh` flag clears; on retry-exhausted
// failure the flag is set so the next queued write knows to try again
// before composing against the stale cache. Without that flag, a
// transient hiccup during refresh would leak stale-cache writes into
// KV indefinitely until a server restart.
async function refreshCacheFromKv(): Promise<void> {
  try {
    const refreshed = await withRetry("canvasStore.refreshCacheFromKv", () =>
      rootServer.dataStore.appData.get<CanvasState>(KV_KEY_CANVAS),
    );
    if (refreshed && refreshed.width > 0 && refreshed.height > 0) {
      cache = refreshed;
    }
    cacheNeedsRefresh = false;
  } catch (err) {
    cacheNeedsRefresh = true;
    log("error", "canvasStore.refreshCacheFromKv failed; cache marked stale", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
