import { rootServer } from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";

// ============================================================================
// appSettingsStore — admin-tunable configuration: cooldown seconds + canvas
// size. KV-backed at the single key "settings".
//
// Compare leveling-leaderboard's appSettingsStore which uses SQLite — that
// app needs indexed queries elsewhere so SQLite was already in play. Here
// the only thing we persist is config (one blob, edited rarely) and the
// canvas itself (also a blob). KV is the right tool for both; SQLite would
// be over-engineering for this sample.
//
// Cache invalidation matches leveling-leaderboard's corrected pattern:
// after a successful KV write, set the cache to undefined so the next
// getSettings() lazily reloads from storage. Avoids both the stale-window
// (cache eagerly updated to a value the KV hasn't accepted yet) and the
// failed-reload-leaves-stale-values trap.
// ============================================================================

export interface AppSettings {
  cooldownSeconds: number;
  // Square canvas; canvasSize is the width AND height. Non-square canvases
  // are an explicit non-goal for this sample (see DESIGN.md).
  canvasSize: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  cooldownSeconds: 30,
  canvasSize: 32,
};

const KV_KEY = "settings";

let cache: AppSettings | undefined;
// Tracks an in-flight `getSettings()` so concurrent callers under a cache
// miss share a single KV roundtrip. Without this, two RPC handlers
// missing the cache simultaneously would each fire their own `appData.get`
// — correct (they'd resolve to the same value) but wasteful in the
// narrow window between cache-miss and cache-set.
let inflight: Promise<AppSettings> | undefined;

export async function getSettings(): Promise<AppSettings> {
  if (cache) return { ...cache };
  if (inflight) return inflight.then((s) => ({ ...s }));
  inflight = (async () => {
    try {
      const stored = await withRetry("appSettingsStore.get", () =>
        rootServer.dataStore.appData.get<AppSettings>(KV_KEY),
      );
      cache = stored ?? DEFAULT_SETTINGS;
      return cache;
    } finally {
      // Clear `inflight` regardless of resolution so a later call after
      // a failed fetch can retry from scratch instead of replaying the
      // same rejected promise. (`cache` is only set on success above —
      // a thrown KV read leaves cache undefined for the next caller.)
      inflight = undefined;
    }
  })();
  return inflight.then((s) => ({ ...s }));
}

export async function updateSettings(next: AppSettings): Promise<void> {
  await withRetry("appSettingsStore.set", () =>
    rootServer.dataStore.appData.set({ key: KV_KEY, value: next }),
  );
  // Invalidate, don't eagerly reload — see header comment.
  cache = undefined;
}
