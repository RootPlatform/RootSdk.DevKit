// ============================================================================
// Recipe: App Settings (Per-Context) — Channel-configs store
// SDK: SQLite via getDb() / run() / all() helpers
// ============================================================================
//
// Persistence layer for the channel_configs list. Lessons:
//
//   1. Composite/external-key SQLite. The primary key is the platform
//      channel id (TEXT), not an auto-incrementing integer. This is the
//      right shape when settings are scoped to an external entity:
//        - channel_id (this recipe)
//        - repo full-name (per-repo config)
//        - user_id (per-user preferences)
//      Auto-increment integer ids would force a separate UNIQUE on the
//      entity column AND require a lookup-by-entity-id round trip on
//      every operation; using the entity id as the PK collapses both.
//
//   2. Upsert via ON CONFLICT DO UPDATE. SQL has a one-statement
//      idiom for "insert if absent, replace if present":
//
//        INSERT INTO channel_configs (channel_id, enabled, priority, updated_at)
//        VALUES (?, ?, ?, ?)
//        ON CONFLICT(channel_id) DO UPDATE SET
//          enabled    = excluded.enabled,
//          priority   = excluded.priority,
//          updated_at = excluded.updated_at
//
//      `excluded.*` refers to the values the INSERT *would have* written
//      had it succeeded. One round trip, atomic, no read-modify-write
//      race. Compare with the KV approach in app-settings-flat-values:
//      KV's update() callback handles partial-merge naturally; SQL's
//      upsert handles full-replace naturally. Each storage shape biases
//      toward a different mutation idiom.
//
//   3. Full-replace semantics. Because upsert sends the whole record,
//      each call sets every field. Partial update on top of SQL upsert is
//      possible (COALESCE on each column with the existing value) but
//      noisier and harder to read. Keep the semantics aligned with the
//      storage shape: full-replace here, partial in flat-values.
//
//   4. In-memory cache of the full list. Same pattern as the prior
//      recipes — invalidate on every mutation, repopulate from the
//      post-mutation query. Single-instance scope; cross-instance is
//      out of scope.
//
// Validation lives next to the store (channelId non-empty, priority in
// range). The service handler maps thrown errors to typed proto rejections.
// ============================================================================

import { all, getDb, run } from "./db";

const MIN_PRIORITY = 0;
const MAX_PRIORITY = 100;

export interface ChannelConfig {
  channel_id: string;
  enabled: boolean;
  priority: number;
  updated_at: string;
}

/** Validation failure on channel_id. */
export class InvalidChannelIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidChannelIdError";
  }
}

/** Validation failure on priority (out of range). */
export class InvalidPriorityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPriorityError";
  }
}

interface ChannelConfigRow {
  channel_id: string;
  enabled: number; // SQLite stores bools as 0/1
  priority: number;
  updated_at: string;
}

let cache: ChannelConfig[] | undefined;

/** Read the full list of configured channels. Cached. */
export async function listConfigs(): Promise<ChannelConfig[]> {
  if (cache) return cache.slice();
  const rows = await all<ChannelConfigRow>(
    getDb(),
    `SELECT channel_id, enabled, priority, updated_at
     FROM channel_configs
     ORDER BY updated_at DESC, channel_id DESC`,
  );
  cache = rows.map(rowToConfig);
  return cache.slice();
}

/**
 * Insert or fully replace the row for `channelId`. Validates inputs,
 * runs a single `INSERT ... ON CONFLICT DO UPDATE`, refreshes the cache,
 * and returns the saved config.
 *
 * Why full replace: see the file header. The proto's UpsertChannelConfig
 * carries every field on every call.
 */
export async function upsertConfig(
  rawChannelId: string,
  enabled: boolean,
  priority: number,
): Promise<ChannelConfig> {
  const channelId = rawChannelId.trim();
  if (channelId.length === 0) {
    throw new InvalidChannelIdError("channel_id must not be empty");
  }
  if (priority < MIN_PRIORITY || priority > MAX_PRIORITY) {
    throw new InvalidPriorityError(
      `priority must be in [${MIN_PRIORITY}, ${MAX_PRIORITY}]`,
    );
  }

  const updatedAt = new Date().toISOString();
  await run(
    getDb(),
    `INSERT INTO channel_configs (channel_id, enabled, priority, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(channel_id) DO UPDATE SET
       enabled    = excluded.enabled,
       priority   = excluded.priority,
       updated_at = excluded.updated_at`,
    [channelId, enabled ? 1 : 0, priority, updatedAt],
  );

  invalidateCache();
  return {
    channel_id: channelId,
    enabled,
    priority,
    updated_at: updatedAt,
  };
}

/**
 * Delete the row for `channelId`. Idempotent — deleting a channel that
 * has no row succeeds silently (changes = 0; nothing to clean up).
 */
export async function deleteConfig(rawChannelId: string): Promise<void> {
  const channelId = rawChannelId.trim();
  if (channelId.length === 0) {
    throw new InvalidChannelIdError("channel_id must not be empty");
  }
  await run(
    getDb(),
    `DELETE FROM channel_configs WHERE channel_id = ?`,
    [channelId],
  );
  invalidateCache();
}

// --- Helpers --------------------------------------------------------------

/**
 * Drop the in-memory cache. The next listConfigs() call rebuilds it from
 * SQLite — we deliberately do NOT pre-fetch here.
 *
 * Why drop-only rather than drop-then-re-read:
 *
 *   1. The write path can't fail with a post-INSERT read error. If the
 *      SELECT after the INSERT throws (transient SQLite error, file lock,
 *      etc.), the write already succeeded — but a re-read inside the same
 *      handler would surface that read error to the caller as a generic
 *      untyped server error, hiding the fact that the row was written.
 *      Drop-only keeps the write path's success/failure tied to the write
 *      itself.
 *
 *   2. The within-instance pile-up race goes away. Two concurrent writers
 *      can both clear the cache, but neither does an immediate SELECT —
 *      they each return the value they just wrote, and the next reader
 *      pays a single read to repopulate.
 *
 *   3. The handler's response shape doesn't depend on a fresh list anyway:
 *      upsertConfig returns the saved row (constructed locally from the
 *      INSERT inputs), and deleteConfig returns nothing. Neither needs
 *      the post-mutation list to build its reply.
 *
 * Cross-instance race remains out of scope (single-instance recipe).
 */
function invalidateCache(): void {
  cache = undefined;
}

function rowToConfig(row: ChannelConfigRow): ChannelConfig {
  return {
    channel_id: row.channel_id,
    enabled: row.enabled !== 0,
    priority: row.priority,
    updated_at: row.updated_at,
  };
}
