// ============================================================================
// Recipe: App Settings (Flat Values) — Settings store
// SDK: rootServer.dataStore.appData (KV)
// ============================================================================
//
// Owns the read + write path for the app's flat settings. Lessons:
//
//   1. Single KV key holds the whole settings record. Flat shapes serialize
//      cleanly as one JSON value; there's no benefit to spreading three
//      knobs across three keys. (Lists or relational shapes belong in
//      SQLite — see the future settings-list-values recipe.)
//
//   2. Defaults are declared once, in code, and merged with whatever's
//      stored. When the app installs and nothing's been written yet, get()
//      returns the defaults. When an admin saves a partial update, the
//      stored record's missing fields are filled from defaults again on the
//      next read — protecting against schema drift if a future version
//      adds a field that older stored records don't have.
//
//   3. In-memory cache. The KV API does a round trip on every get; for
//      values read on every request (e.g. cooldown enforced per message)
//      that adds up. Cache the parsed object; invalidate it on every
//      local write so the next read pulls the merged result back from KV.
//
//      Scope: the cache is per-instance. The KV API emits no change events,
//      and a service's outgoing broadcasts go to clients, not to sibling
//      app-server instances. A multi-instance deployment where two app
//      servers write to the same community would need an out-of-band
//      coordination channel (e.g., a polling refresh, or a platform-level
//      pub/sub) — out of scope for this recipe, which targets the common
//      single-instance case.
//
// ============================================================================

import { rootServer } from "@rootsdk/server-app";
import { SettingsValues } from "@appsettingsflatvalues/gen-shared";

// Single KV key. Namespacing not strictly necessary in a recipe that uses
// only one key, but the prefix makes it grep-friendly when the recipe gets
// extended with more keys later. Real apps with several settings groups
// might use "settings/general", "settings/integrations", etc.
const SETTINGS_KEY = "settings/general";

/**
 * Defaults applied when no record has been written yet, AND when a stored
 * record is missing fields (schema drift after upgrade). Declared once here;
 * the proto's default zero-values are not used because uint32=0 and bool=
 * false aren't necessarily what we want to ship as default UX.
 */
export const DEFAULT_SETTINGS: SettingsValues = {
  welcomeMessage: "Hello, world.",
  maxItems: 10,
  showTimestamps: true,
};

let cache: SettingsValues | undefined;

/**
 * Read the current settings. Cheap on the hot path — returns from cache
 * when populated, or hydrates from KV on first call / after invalidation.
 * Always merged against DEFAULT_SETTINGS so callers can rely on every
 * field being present even if the stored record is partial.
 */
export async function getSettings(): Promise<SettingsValues> {
  if (cache) return { ...cache };
  const stored = await rootServer.dataStore.appData.get<Partial<SettingsValues>>(
    SETTINGS_KEY,
  );
  cache = mergeWithDefaults(stored);
  return { ...cache };
}

/**
 * Apply a partial update. Reads-modifies-writes the full record so that
 * fields the caller didn't supply keep their current stored value. Returns
 * the merged result so the RPC handler can return it directly.
 *
 * Wrapped in `update()` for atomicity — if two admins click Save at the
 * same time, the KV layer serializes the read-modify-write so neither
 * write is lost. The provided defaultValue is what's used if the key
 * doesn't exist yet (first ever write); applying the partial over
 * DEFAULT_SETTINGS gives the same shape as the merge in getSettings.
 */
export async function updateSettings(
  partial: Partial<SettingsValues>,
): Promise<SettingsValues> {
  const merged = await rootServer.dataStore.appData.update<SettingsValues>(
    SETTINGS_KEY,
    (current) => ({ ...current, ...definedFields(partial) }),
    { ...DEFAULT_SETTINGS },
  );
  // Repopulate the cache directly with the merged value the KV layer just
  // wrote. The next read returns this without a round trip; common path
  // is a save followed by a re-read driven by the SettingsChanged
  // broadcast, and we'd rather serve from cache than re-fetch.
  //
  // Residual race: a getSettings() that started its KV.get() before this
  // update() resolved can race here — its read returns the OLD value, and
  // when it sets cache = mergeWithDefaults(stale) it overwrites the
  // merged we just stored. Window is the duration of an in-flight read
  // overlapping a write; single-instance recipes rarely hit it. Truly
  // closing it needs a generation counter or a mutex around the cache
  // update; out of scope for this teaching recipe.
  cache = { ...merged };
  return merged;
}

// --- Helpers ----------------------------------------------------------------

/**
 * Strip undefined fields from a partial. proto3 optional fields come
 * across as `undefined` when the caller didn't set them; spreading those
 * into the merge would clobber stored values with undefined. Filter so
 * the spread only touches fields the caller deliberately set.
 */
function definedFields<T extends object>(partial: Partial<T>): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Merge a (possibly missing or partial) stored record with defaults.
 * Two purposes: (a) on first run there's nothing stored, return defaults;
 * (b) after a future schema migration adds a new field, older stored
 * records lack it — the merge fills it from defaults instead of returning
 * undefined.
 */
function mergeWithDefaults(
  stored: Partial<SettingsValues> | undefined,
): SettingsValues {
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}
