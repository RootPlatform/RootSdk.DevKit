import { rootServer, CommunityRoleGuid } from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";
import { log } from "./lib/log";

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
//   - readConfig() returns the live reference, not a deep clone. Callers
//     must treat the returned object as immutable; mutating it would corrupt
//     the cache. We don't Object.freeze defensively because the call sites
//     are few and the cost of a recursive freeze on every write isn't
//     worth it for a sample. A production fork that wants belt-and-braces
//     can wrap the cache in Object.freeze on each writeConfig() call.
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

  // Reconcile against the live community-role universe. The runtime
  // CommunityRoleDeleted subscription only catches deletions that happen
  // while the app is running; a role deleted during downtime (deploy,
  // crash, restart) leaves a stale role ID in our config that the
  // resolveGroups response-time filter merely hides — but the KV blob
  // still carries it. Without this one-shot reconcile, the picker config
  // accumulates orphan IDs across restarts. Cheap to do once at startup;
  // fixes the gap that the README "known limits" used to imply was
  // unaddressed.
  await reconcileAgainstLiveRoles();
}

async function reconcileAgainstLiveRoles(): Promise<void> {
  if (!cache || cache.groups.length === 0) return;
  const live = await withRetry("communityRoles.list", () =>
    rootServer.community.communityRoles.list(),
  );
  const liveIds = new Set(live.map((r) => r.id));

  let dropped = 0;
  const reconciled: PickerConfig = {
    groups: cache.groups.map((g) => {
      const filtered = g.roles.filter((r) => liveIds.has(r.roleId));
      dropped += g.roles.length - filtered.length;
      return { ...g, roles: filtered };
    }),
  };
  if (dropped === 0) return;

  await writeConfig(reconciled);
  log("info", "picker config reconciled against live roles at startup", {
    droppedRoleCount: dropped,
  });
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
