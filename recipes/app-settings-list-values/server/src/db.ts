// ============================================================================
// SQLite open + promisified helpers + schema migration.
// Same pattern as data-paginated-list/server/src/db.ts and leveling-leaderboard/
// server/src/db.ts. The duplication is a teaching choice — recipes read
// top-to-bottom; cross-recipe DRY is a series-wide refactor target once
// 4-5 recipes have stabilized the shape.
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

export function all<T>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}

// --- Schema -----------------------------------------------------------------

export async function runSchemaMigrations(db: Database): Promise<void> {
  // blocked_terms: list-shaped settings collection.
  //
  //   id is INTEGER PRIMARY KEY AUTOINCREMENT — stable per-row identity used
  //     by RemoveBlockedTerm. AUTOINCREMENT (vs implicit ROWID) guarantees
  //     ids are never reused after deletes.
  //   term has UNIQUE so duplicate adds become idempotent via INSERT OR
  //     IGNORE — no transaction or check-then-insert dance required.
  //   added_at is for ordering (newest first) and diagnostics. Stored as
  //     TEXT in ISO 8601 because SQLite doesn't have a native timestamp
  //     type and ISO strings sort lexicographically by chronological order.
  //
  // No seed — the list starts empty.
  await run(db, `
    CREATE TABLE IF NOT EXISTS blocked_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL UNIQUE,
      added_at TEXT NOT NULL
    )
  `);
  // Composite index covering the list query's full sort order
  // (added_at DESC, id DESC). The id tiebreak in the SELECT matters —
  // two adds in the same millisecond produce equal added_at values, and
  // without the tiebreak the row order between them is engine-defined
  // (and therefore unstable across reads). The index has to include the
  // tiebreak column or SQLite will sort the tie-breaking subrange in
  // memory, defeating the index for any list that hits the collision.
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_blocked_terms_added_at
    ON blocked_terms (added_at DESC, id DESC)
  `);
}
