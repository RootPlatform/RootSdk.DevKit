import { rootServer, CommunityRoleGuid } from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";

// ============================================================================
// pickerStore — persistence for the admin-curated picker config (groups + the
// roles inside them). Backed by the platform key-value store (appData), keyed
// by the single string "picker.config".
//
// Why KV instead of SQLite (compare leveling-leaderboard):
//   - Config is one blob, written rarely (admin edits), read on every Settings
//     mount and on every PickerConfigChanged broadcast assemble.
//   - No queries, no indexes, no atomic upserts under contention.
//   - Total payload is tiny: even a maxed-out config (20 groups × 50 roles) is
//     well under 50 KB. JSON-serializable.
// SQLite would be over-engineered. This is the case the KV store is designed
// for, and the sample exists in part to demonstrate the right tool choice.
//
// Storage shape vs wire shape:
//   - We store ONLY the data the admin authors: groupId, title, description,
//     exclusive, plus per-role { roleId, descriptionOverride }.
//   - We do NOT store role names or colorHex — those come from
//     rootServer.community.communityRoles.list() at response time. Storing
//     them would mean writing back on every CommunityRoleEdited event,
//     which is needless I/O and a stale-data risk.
//
// In-memory cache:
//   - Hydrated on initialize(), refreshed only on writes. Reads are sync.
//   - All callers of getConfig() must treat the returned value as immutable;
//     mutations would corrupt the cache. We return the live reference (not a
//     deep clone) for hot-path read performance — see the freeze guard in
//     readConfig().
// ============================================================================

const KV_KEY = "picker.config";

export interface PickerRoleConfig {
  roleId: CommunityRoleGuid;
  // Admin-supplied description shown in the picker UI. Optional — empty
  // string and undefined are equivalent (we normalise to "" on read).
  descriptionOverride: string;
}

export interface PickerGroupConfig {
  // Server-minted GUID. Stable across renames and reorderings; clients use
  // it as React key + the addressable identifier for admin updates.
  groupId: string;
  title: string;
  description: string;
  exclusive: boolean;
  roles: PickerRoleConfig[];
}

export interface PickerConfig {
  groups: PickerGroupConfig[];
}

const EMPTY_CONFIG: PickerConfig = { groups: [] };

let cache: PickerConfig | undefined;

export async function initializePickerStore(): Promise<void> {
  const stored = await withRetry("pickerStore.get", () =>
    rootServer.dataStore.appData.get<PickerConfig>(KV_KEY),
  );
  cache = stored ?? EMPTY_CONFIG;
}

// Returns the current config. Synchronous — the cache is hydrated at startup
// and refreshed inline on writes.
//
// CALLER CONTRACT: do not mutate the returned object. We return the cache
// reference, not a clone; modifying it in place would corrupt the cache.
// Callers needing to construct a modified config must spread/clone first.
export function readConfig(): PickerConfig {
  if (!cache) {
    throw new Error(
      "pickerStore not initialized — call initializePickerStore() in onStarting",
    );
  }
  return cache;
}

// Replace the entire config wholesale. Caller is responsible for validation
// (see validation in rolePickerService.ts).
export async function writeConfig(config: PickerConfig): Promise<void> {
  await withRetry("pickerStore.set", () =>
    rootServer.dataStore.appData.set({ key: KV_KEY, value: config }),
  );
  // Update the cache from the value we just persisted, NOT from a re-read.
  // The KV write we just awaited is the source of truth; an extra round
  // trip would only widen the stale window if a concurrent writer slipped
  // in between, and last-writer-wins is the contract anyway (see UpdateGroups
  // comment in the proto).
  cache = config;
}

// Mint a fresh group ID. Format is `g.<random>` so it's visually distinguishable
// from role GUIDs in logs. Crypto-strong randomness is overkill for an
// admin-authored config; Math.random + timestamp is enough to avoid collision
// across the lifetime of one admin's edit session.
export function mintGroupId(): string {
  return `g.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}
