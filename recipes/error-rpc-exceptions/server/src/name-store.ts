// ============================================================================
// Recipe: RPC Exceptions — Storage layer
// SDK: rootServer.dataStore.appData (key-value store)
// ============================================================================
//
// One key holds the whole record: { name, claimedBy }. Atomic update via
// the KV `update()` API ensures two simultaneous claims serialize without
// either of them silently winning.
//
// Storage choice rationale: the entity is a single tuple, never a list,
// never relational. KV is the right shape. A list of historical claims
// would belong in SQLite (see app-settings-list-values for that pattern).
//
// Empty-slot encoding: an empty `claimedBy` string represents "no claim".
// `update()` requires a default value of the stored type, so the default
// is `{ name: "", claimedBy: "" }`. After a release the key is deleted
// outright; the next claim's `update()` then re-creates from the default.
// ============================================================================

import { rootServer } from "@rootsdk/server-app";

const STORE_KEY = "claim";

const EMPTY_CLAIM: ClaimRecord = { name: "", claimedBy: "" };

export interface ClaimRecord {
  name: string;
  claimedBy: string;
}

/**
 * Read the current claim. Returns undefined when the slot is empty (key
 * absent, or stored record has no claimer).
 */
export async function getClaim(): Promise<ClaimRecord | undefined> {
  const stored = await rootServer.dataStore.appData.get<ClaimRecord>(STORE_KEY);
  if (!stored || !stored.claimedBy) return undefined;
  return stored;
}

/**
 * Atomic claim: succeeds only if the slot is empty. Returns the record on
 * success, or `undefined` if the slot was already taken (the caller maps
 * that to ClaimError.NAME_ALREADY_CLAIMED).
 *
 * The `update()` callback receives the current stored value (or the
 * supplied default if the key is absent) and returns the new value. The
 * KV layer serializes concurrent calls so two claimers racing for the
 * same empty slot won't both succeed — one wins, the other sees the
 * winner's value on its next read.
 */
export async function claimIfEmpty(record: ClaimRecord): Promise<ClaimRecord | undefined> {
  let result: ClaimRecord | undefined;
  await rootServer.dataStore.appData.update<ClaimRecord>(
    STORE_KEY,
    (current) => {
      if (current.claimedBy) {
        // Slot already taken — keep the existing record; signal failure
        // to the caller via the closure variable.
        result = undefined;
        return current;
      }
      result = record;
      return record;
    },
    EMPTY_CLAIM,
  );
  return result;
}

export async function releaseClaim(): Promise<void> {
  await rootServer.dataStore.appData.delete(STORE_KEY);
}
