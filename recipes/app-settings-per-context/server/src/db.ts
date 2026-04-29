// ============================================================================
// SQLite open + promisified helpers + schema migration.
// Same pattern as the prior recipes (data-paginated-list, app-settings-list-
// values). Per-recipe duplication is a teaching choice — a series-wide
// refactor target once the shape stabilizes.
// ============================================================================

import { rootServer } from "@rootsdk/server-app";
import sqlite3 from "sqlite3";

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

// --- Schema ----------------------------------------------------------------

export async function runSchemaMigrations(db: Database): Promise<void> {
  // channel_configs: one row per configured channel.
  //
  //   channel_id is TEXT PRIMARY KEY — the platform's channel id is the
  //     natural key. PRIMARY KEY automatically gives us the UNIQUE +
  //     index for free, and it's the column the upsert's ON CONFLICT
  //     clause targets.
  //   enabled is INTEGER (0/1) because SQLite has no native bool type.
  //     The store's row mapper coerces to/from JS boolean at the boundary
  //     so the rest of the recipe deals in real booleans.
  //   updated_at is TEXT in ISO 8601 — sorts lexicographically by
  //     chronological order, no native timestamp type required.
  //
  // No seed — channels start with no config (which the runtime treats as
  // "use app-wide defaults", though this recipe doesn't exercise that
  // runtime path; the lesson here is the storage/admin UX).
  await run(db, `
    CREATE TABLE IF NOT EXISTS channel_configs (
      channel_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      priority INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Composite index on (updated_at DESC, channel_id DESC) for the list
  // query's full sort order. Same rationale as
  // app-settings-list-values' index — tiebreak on the secondary key so the
  // sort is stable when two writes land in the same millisecond, and the
  // index has to include the tiebreak column or SQLite sorts the tied
  // subrange in memory.
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_channel_configs_updated_at
    ON channel_configs (updated_at DESC, channel_id DESC)
  `);
}
