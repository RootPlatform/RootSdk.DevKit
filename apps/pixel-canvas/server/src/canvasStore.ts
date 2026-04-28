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
// Two stores:
//
//   1. CANVAS state (KV) — a sparse map of placed pixels keyed by "x,y".
//      Stored at KV key "canvas". Sparse format means absent cells render
//      as a neutral background on the client. ~320 KB serialized at max
//      canvas + full paint — within KV's small-blob zone.
//
//   2. PER-USER COOLDOWN map (in-memory only) — userId → lastPlacedAtMs.
//      Lost on restart; everyone gets one "free" placement before
//      cooldown re-establishes. Acceptable trade-off for a sample.
//
// In-memory cache for the canvas state itself: hydrated at initialize, kept
// in sync after every successful write. readCanvas() returns the live
// reference (not a clone) — callers must treat it as immutable.
//
// Concurrency, atomicity, and commit-but-reported-failure recovery are
// the meat of this file. The why-this-shape rationale (TOCTOU on
// cooldown, blob race between placements, the recovery model when the
// SDK reports failure on a write that actually committed) lives in
// DESIGN.md "Cooldown: in-memory map + atomic check-then-place" and
// the surrounding sections — keeping it there means a fork that swaps
// the data model (KV → SQLite, blob → per-row, etc.) doesn't carry
// stale "race A vs B" prose into a file where the races no longer
// apply. The per-function comments below cover the LOCAL invariants:
// what each defense does and what would break if a future cleanup
// dropped it.
//
// Single-process assumption: this whole scheme works because there's
// exactly one server instance. README "Known limits" makes that
// explicit. A multi-process deployment would need a real distributed
// lock (or KV-level CAS primitives).
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

// Canonicalize stored pixel colors to uppercase hex. New writes go through
// pixelCanvasService.canonicalizeColor which already uppercases, but
// snapshots from a prior version (or hand-edited KV state during
// migration) may contain lowercase entries. Canonicalize-on-hydrate
// keeps the cache uniform so the (color, userId, placedAt) commit-
// detection triple in placePixelIfCooldownElapsed compares apples-to-
// apples regardless of historical KV state. Cheap: a one-pass
// re-walk on hydrate or refresh, no per-write cost.
function canonicalizeStored(state: CanvasState): CanvasState {
  let needs = false;
  for (const k in state.pixels) {
    const c = state.pixels[k]?.color;
    if (c && c !== c.toUpperCase()) {
      needs = true;
      break;
    }
  }
  if (!needs) return state;
  const pixels: Record<string, PixelData> = {};
  for (const [k, v] of Object.entries(state.pixels)) {
    pixels[k] = v.color === v.color.toUpperCase()
      ? v
      : { ...v, color: v.color.toUpperCase() };
  }
  return { width: state.width, height: state.height, pixels };
}

export async function initializeCanvasStore(initialSize: number): Promise<void> {
  const stored = await withRetry("canvasStore.get", () =>
    rootServer.dataStore.appData.get<CanvasState>(KV_KEY_CANVAS),
  );
  if (stored && stored.width > 0 && stored.height > 0) {
    cache = canonicalizeStored(stored);
  } else {
    // First-run path: write an empty canvas of the configured initial size.
    // This write deliberately does NOT go through serializeCanvasWrite —
    // initializeCanvasStore runs in onStarting before addService, so there
    // are no concurrent writers yet (no RPCs are dispatched). A future
    // "let's serialize ALL writes for symmetry" cleanup would be wrong:
    // the queue is for runtime contention, not initialization.
    const initial: CanvasState = { width: initialSize, height: initialSize, pixels: {} };
    await writeValue(initial);
    cache = initial;
    log("info", "canvas initialized", { width: initialSize, height: initialSize });
  }
}

// Background retry for cacheNeedsRefresh. When refreshCacheFromKv exhausts
// retries, the flag stays set; the next QUEUED write will retry inside
// the lock — but on an idle server (no placements, no clears), the flag
// can stay set forever and readCanvas() keeps returning stale pixels to
// every connecting client. This timer wakes periodically and tries to
// recover the cache through the serialization queue so the read path
// catches up without needing a write to fire first. unref() so the
// process can exit cleanly when no other handles are pending.
const REFRESH_RETRY_INTERVAL_MS = 30_000;
setInterval(() => {
  if (!cacheNeedsRefresh) return;
  void serializeCanvasWrite(async () => {
    if (cacheNeedsRefresh) await refreshCacheFromKv();
  }).catch(() => {
    // refreshCacheFromKv already logs on its own failure path; the outer
    // catch is just to swallow the rejection so it doesn't surface as
    // an unhandled promise rejection.
  });
}, REFRESH_RETRY_INTERVAL_MS).unref();

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
        //
        // The (color, userId, placedAt) triple is unique per placement
        // here: the synchronous cooldown claim above means no two
        // requests from the same user can both be in this code path
        // within the same cooldown window, so two same-user placements
        // can't share a placedAt. Two DIFFERENT users with the same
        // millisecond would be distinguished by userId. A peer placement
        // landing on the same cell after our refresh would have a
        // different placedAt (its own request's `now`) and thus not
        // match.
        //
        // Both-fail (writeValue threw AND refresh fails): refreshCacheFromKv
        // catches its own error and sets cacheNeedsRefresh = true without
        // rethrowing, so we still reach the triple-match — but `cache`
        // hasn't been replaced, so it's whatever it was BEFORE this
        // attempt (we only assign `cache = next` after writeValue
        // succeeds). Triple-match against that pre-state either finds
        // no entry or a different prior placedAt, so it fails closed
        // and we throw writeErr → outer catch rolls back the cooldown.
        // cacheNeedsRefresh stays set so the next queued write (or the
        // 30s background timer) retries the refresh before composing
        // against the stale cache.
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
    // Only roll back if the cooldown still equals OUR claim. Under
    // sustained KV slowness, A's serialized write can sit in the queue
    // for longer than cooldownMs, after which a same-user request B
    // legitimately passes the cooldown check (because A's claim is now
    // older than cooldownMs) and sets cooldown to its own `now`. If
    // B's write commits before A's catch runs, the cooldown map holds
    // B's valid claim. Unconditionally rolling back here would clobber
    // B's claim, letting the user place again immediately and bypass
    // the cooldown they should be on. Compare against `now` (the value
    // A wrote) so the rollback only fires when no concurrent claim
    // has overwritten it.
    if (cooldown.get(userId) === now) {
      if (previousCooldown === undefined) cooldown.delete(userId);
      else cooldown.set(userId, previousCooldown);
    }
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
    // Same cacheNeedsRefresh guard as placePixelIfCooldownElapsed:
    // without this, a no-resize clear (newSize undefined) would read
    // `cache.width` from a known-stale cache and write the wrong
    // dimensions back to KV. Try to refresh once; abort if still stale.
    if (cacheNeedsRefresh) {
      await refreshCacheFromKv();
      if (cacheNeedsRefresh) {
        throw new Error(
          "canvasStore cache is stale and refresh failed — clear aborted",
        );
      }
    }
    if (!cache) throw new Error("canvasStore not initialized");
    const size = newSize ?? cache.width;
    const next: CanvasState = { width: size, height: size, pixels: {} };
    try {
      await writeValue(next);
      cache = next;
      return cache;
    } catch (err) {
      // Symmetric with placePixelIfCooldownElapsed: writeValue may have
      // committed at the storage layer but reported failure on the
      // response (timeout post-commit). Refresh from KV; if the
      // refreshed state matches what we tried to write (same dims,
      // empty pixels), the clear DID land — return success so the
      // caller can broadcast CanvasCleared. Without this, an admin's
      // clear that quietly committed would still throw to the RPC,
      // suppress the broadcast, and leave every connected client
      // showing stale pixels until their next refresh. If the
      // refreshed state doesn't match, propagate the error and let
      // the caller's retry path try again.
      await refreshCacheFromKv();
      if (
        cache &&
        cache.width === next.width &&
        cache.height === next.height &&
        Object.keys(cache.pixels).length === 0
      ) {
        return cache;
      }
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
      // Same canonicalize-on-hydrate as initializeCanvasStore — see
      // canonicalizeStored's comment for rationale.
      cache = canonicalizeStored(refreshed);
      // Only clear the stale flag when we actually replaced the cache
      // with a valid blob. If KV legitimately returned nothing (which
      // shouldn't happen post-init but is defended against above),
      // leaving the flag set means the next queued write will retry
      // the refresh — exactly the silent-corruption case the flag was
      // added to prevent.
      cacheNeedsRefresh = false;
    } else {
      // KV returned null or invalid dimensions. Shouldn't happen
      // post-initializeCanvasStore — that path always writes a valid
      // initial blob and subsequent writes preserve dimensions — but
      // log if it does so the impossible-but-possible case surfaces.
      // Set cacheNeedsRefresh explicitly so the next queued write or
      // the background retry timer tries again. The earlier comment
      // here said "leave the flag set" but the else-branch also runs
      // on a successful read with valid-but-unexpected data shape, so
      // we'd otherwise inherit whatever pre-state the flag had —
      // which could be false on a retry-after-success path.
      cacheNeedsRefresh = true;
      log("warn", "canvasStore.refreshCacheFromKv: KV returned no valid blob; marking cache stale", {
        hasResult: !!refreshed,
        width: refreshed?.width,
        height: refreshed?.height,
      });
    }
  } catch (err) {
    cacheNeedsRefresh = true;
    log("error", "canvasStore.refreshCacheFromKv failed; cache marked stale", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
