import { Database, all, run, transaction } from "./db";

// ============================================================================
// appSettingsStore — numeric knobs managed inside the app (not in the manifest).
// Table: app_settings(key, value). Keys: "xp_per_message", "cooldown_seconds",
// "level_curve_coefficient".
//
// Defaults are seeded in runSchemaMigrations (db.ts). The `??` fallbacks below
// are defensive only — they shouldn't normally be hit.
//
// In-memory cache: the message handler reads settings on every eligible
// message. Even though the underlying SELECT is fast (3 rows behind a PK
// index, OS page cache), removing the per-message DB round trip is a free
// win. Cache is invalidated explicitly on `updateSettings` (single-process
// app, no cross-instance coherence to worry about). Mirrors the pattern in
// excludedChannelsStore.
// ============================================================================

export interface AppSettings {
  xpPerMessage: number;
  cooldownSeconds: number;
  levelCurveCoefficient: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  xpPerMessage: 10,
  cooldownSeconds: 60,
  levelCurveCoefficient: 100,
};

const KEY_XP = "xp_per_message";
const KEY_COOLDOWN = "cooldown_seconds";
const KEY_CURVE = "level_curve_coefficient";

let cache: AppSettings | undefined;

async function loadFromDb(db: Database): Promise<AppSettings> {
  const rows = await all<{ key: string; value: number }>(
    db,
    `SELECT key, value FROM app_settings`,
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    xpPerMessage: map.get(KEY_XP) ?? DEFAULT_SETTINGS.xpPerMessage,
    cooldownSeconds: map.get(KEY_COOLDOWN) ?? DEFAULT_SETTINGS.cooldownSeconds,
    levelCurveCoefficient: map.get(KEY_CURVE) ?? DEFAULT_SETTINGS.levelCurveCoefficient,
  };
}

export async function getSettings(db: Database): Promise<AppSettings> {
  if (cache) return { ...cache };
  cache = await loadFromDb(db);
  // Return a shallow copy so a caller that mutates the returned object can't
  // corrupt the cache. AppSettings is flat, so spread is sufficient.
  return { ...cache };
}

// Write all three keys atomically. A crash after one INSERT but before the
// others would otherwise leave a mix of old and new values.
export async function updateSettings(db: Database, settings: AppSettings): Promise<void> {
  await transaction(db, async () => {
    await run(db, `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [KEY_XP, settings.xpPerMessage]);
    await run(db, `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [KEY_COOLDOWN, settings.cooldownSeconds]);
    await run(db, `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [KEY_CURVE, settings.levelCurveCoefficient]);
  });
  // Invalidate the cache immediately after commit so the next getSettings()
  // lazily reloads from the DB. We deliberately do NOT eagerly reload here:
  //   * Between "clear cache" and "reload complete" there'd be a window
  //     where a concurrent getSettings() returns the old cached values.
  //   * If the reload threw (transient DB hiccup), the cache would be left
  //     holding stale values until the next successful updateSettings.
  // A single `cache = undefined` assignment after commit sidesteps both by
  // making the next read's correctness independent of this function
  // completing any further work.
  cache = undefined;
}
