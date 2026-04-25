import { rootServer } from "@rootsdk/server-app";
import sqlite3 from "sqlite3";

// ============================================================================
// SQLite open + promisified helpers + schema migrations.
// See api-samples/server-database for the base pattern.
// ============================================================================

export type Database = sqlite3.Database;

let _db: Database | undefined;

export async function openDatabase(): Promise<Database> {
  if (_db) return _db;
  const config = rootServer.dataStore.config.sqlite3;
  if (!config) {
    throw new Error("SQLite config not available — check databaseType");
  }
  // Use the callback form so an open failure (missing file, perms, locked)
  // surfaces here at startup rather than on the first query later. Without
  // this, errors from the underlying open are silently deferred and crash
  // an unrelated request handler with a confusing stack.
  _db = await new Promise<Database>((resolve, reject) => {
    const db = new sqlite3.Database(config.filename, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
  return _db;
}

// Accessor for modules that don't get `db` threaded through (service + handler
// + broadcaster). Stores always take db as a parameter.
export function getDb(): Database {
  if (!_db) throw new Error("Database not opened yet — openDatabase() first");
  return _db;
}

// --- Promisified helpers ----------------------------------------------------

export function run(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

// Like run(), but resolves with the number of rows changed. Used by
// conditional updates (e.g., addXpIfCooldownElapsed) to tell whether the
// WHERE clause allowed the change.
// Uses `function()` (not arrow) so sqlite3 can bind `this.changes`.
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

// Like run(), but resolves with the auto-incremented id of the last inserted
// row. Use only with INSERT statements on tables that have an INTEGER PRIMARY
// KEY AUTOINCREMENT column. `function()` is required so sqlite3 can bind
// `this.lastID`.
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
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });
}

export function all<T>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}

// Run a set of statements in a single transaction. Rolls back on any error.
//
// Serialized via a module-level promise chain so concurrent callers queue up
// rather than colliding on nested BEGIN (which SQLite rejects on a shared
// connection). Rejection from one transaction does not poison the chain —
// subsequent callers proceed independently.
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

// --- Schema -----------------------------------------------------------------
//
// Single idempotent migration. No migration framework — this is a teaching sample.

export async function runSchemaMigrations(db: Database): Promise<void> {
  // xp: one row per member who has earned any XP. last_award_at is the
  // tie-breaker for equal totals (earlier wins — see DESIGN.md Top 10 leaderboard).
  await run(db, `
    CREATE TABLE IF NOT EXISTS xp (
      user_id TEXT PRIMARY KEY,
      total_xp INTEGER NOT NULL DEFAULT 0,
      last_award_at INTEGER NOT NULL DEFAULT 0
    )
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_xp_ranking
    ON xp (total_xp DESC, last_award_at ASC)
  `);

  // xp_awards: append-only log, pruned per-user to the 20 newest.
  await run(db, `
    CREATE TABLE IF NOT EXISTS xp_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_xp_awards_user_ts
    ON xp_awards (user_id, timestamp DESC)
  `);

  // app_settings: single-row-ish KV for numeric knobs.
  await run(db, `
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    )
  `);

  // Seed defaults on first run. INSERT OR IGNORE makes this idempotent and
  // safe to re-run on every startup. Keeping this in migrations (not in a
  // lazy "seed on first getSettings") means the read path stays a pure
  // SELECT — no write-on-read surprise.
  // Defaults MUST match DEFAULT_SETTINGS in appSettingsStore.ts.
  await run(db, `
    INSERT OR IGNORE INTO app_settings (key, value) VALUES
      ('xp_per_message', 10),
      ('cooldown_seconds', 60),
      ('level_curve_coefficient', 100)
  `);

  // excluded_channels: set of channel IDs excluded from XP.
  await run(db, `
    CREATE TABLE IF NOT EXISTS excluded_channels (
      channel_id TEXT PRIMARY KEY
    )
  `);
}
