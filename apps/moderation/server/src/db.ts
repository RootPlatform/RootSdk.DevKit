import { rootServer } from "@rootsdk/server-app";
import sqlite3 from "sqlite3";

// SQLite open + promisified helpers + schema migrations. Pattern adapted
// from apps/leveling-leaderboard/server/src/db.ts.

export type Database = sqlite3.Database;

let _db: Database | undefined;

export async function openDatabase(): Promise<Database> {
  if (_db) return _db;
  const config = rootServer.dataStore.config.sqlite3;
  if (!config) {
    throw new Error("SQLite config not available — check databaseType");
  }
  _db = await new Promise<Database>((resolve, reject) => {
    const db = new sqlite3.Database(config.filename, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
  return _db;
}

export function getDb(): Database {
  if (!_db) throw new Error("Database not opened yet — openDatabase() first");
  return _db;
}

// --- Promisified helpers ---------------------------------------------------

export function run(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

export function runWithChanges(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

export function runWithLastID(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

export function get<T>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) =>
      err ? reject(err) : resolve(row as T | undefined),
    );
  });
}

export function all<T>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) =>
      err ? reject(err) : resolve(rows as T[]),
    );
  });
}

let txMutex: Promise<unknown> = Promise.resolve();

export async function transaction<T>(
  db: Database,
  fn: () => Promise<T>,
): Promise<T> {
  const prior = txMutex.catch(() => undefined);
  const current = prior.then(async () => {
    await run(db, "BEGIN TRANSACTION");
    try {
      const result = await fn();
      await run(db, "COMMIT");
      return result;
    } catch (err) {
      try {
        await run(db, "ROLLBACK");
      } catch {
        // Rollback may fail if the transaction already aborted. Ignore.
      }
      throw err;
    }
  });
  txMutex = current;
  return current;
}

// --- Schema migrations -----------------------------------------------------
//
// Tables:
//   words           — custom + allowed word lists. Category column splits the
//                     two; both share the same shape so list/search RPCs
//                     parameterize on category.
//   audit_log       — append-only moderation actions; pruned daily by the
//                     retention job.
//   recent_messages — short-lived rolling buffer for spam detection. One row
//                     per message in the spam window; rows older than the
//                     window are pruned when the buffer is consulted.
//   rate_messages   — short-lived rolling buffer for rate limiting. Same shape
//                     as recent_messages but a separate table since the two
//                     features have independent windows.
//   monitored_channels — list of channel IDs explicitly monitored; empty
//                     table means "monitor all channels" per design.md.

export async function runSchemaMigrations(db: Database): Promise<void> {
  await run(db, `
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      category INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);
  // Distinct (text, category) pair — a word can exist on both the custom and
  // allowed lists if an admin really wants that, but it can't appear twice in
  // the same list.
  await run(db, `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_words_text_category
    ON words (text, category)
  `);
  // Common case: list a category, ordered newest first.
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_words_category_id
    ON words (category, id DESC)
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      action INTEGER NOT NULL,
      rule INTEGER NOT NULL,
      target_user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL DEFAULT '',
      target_nickname TEXT NOT NULL DEFAULT '',
      message_excerpt TEXT NOT NULL DEFAULT '',
      matched_term TEXT NOT NULL DEFAULT '',
      manual INTEGER NOT NULL DEFAULT 0,
      actor_user_id TEXT NOT NULL DEFAULT '',
      actor_nickname TEXT NOT NULL DEFAULT ''
    )
  `);
  // Idempotent column-rename + add migrations. Pattern (transferable to
  // any column added after first ship):
  //   1. PRAGMA table_info(<table>) returns column rows.
  //   2. Build a Set of existing column names.
  //   3. For each desired column not present, ALTER TABLE ADD COLUMN.
  //   4. For renames, ALTER TABLE RENAME COLUMN — only if the legacy
  //      name still exists AND the new name doesn't.
  // SQLite 3.25+ supports both ADD COLUMN and RENAME COLUMN safely.
  const cols = await all<{ name: string }>(
    db,
    `PRAGMA table_info(audit_log)`,
  );
  const colNames = new Set(cols.map((c) => c.name));
  // Rename: legacy `target_username` → `target_nickname`. The SDK
  // exposes `nickname` (community-visible name) but no clean global-
  // username lookup, so the app filters / displays nickname end to end
  // — see DESIGN.md → "Audit log nicknames".
  if (colNames.has("target_username") && !colNames.has("target_nickname")) {
    await run(
      db,
      `ALTER TABLE audit_log RENAME COLUMN target_username TO target_nickname`,
    );
  }
  // Add: `actor_nickname` so the audit log can render an admin's
  // frozen-at-action nickname for manual rows (kick / ban / clear).
  if (!colNames.has("actor_nickname")) {
    await run(
      db,
      `ALTER TABLE audit_log ADD COLUMN actor_nickname TEXT NOT NULL DEFAULT ''`,
    );
  }
  // Listing newest first is the default; the cursor query also seeks on id.
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_audit_log_id_desc
    ON audit_log (id DESC)
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_audit_log_target_user
    ON audit_log (target_user_id, id DESC)
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
    ON audit_log (timestamp)
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS recent_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_recent_user_hash_ts
    ON recent_messages (user_id, content_hash, timestamp)
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_recent_user_channel_hash_ts
    ON recent_messages (user_id, channel_id, content_hash, timestamp)
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS rate_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_rate_user_ts
    ON rate_messages (user_id, timestamp)
  `);

  await run(db, `
    CREATE TABLE IF NOT EXISTS monitored_channels (
      channel_id TEXT PRIMARY KEY
    )
  `);
}
