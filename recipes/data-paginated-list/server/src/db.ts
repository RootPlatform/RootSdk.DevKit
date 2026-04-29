// ============================================================================
// SQLite open + promisified helpers + schema migration + seed.
// Slimmed-down version of the leveling-leaderboard pattern (apps/leveling-
// leaderboard/server/src/db.ts), reduced to what this recipe needs.
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
  // Callback form so an open failure (missing file, perms, locked) surfaces
  // here at startup rather than on the first query later.
  _db = await new Promise<Database>((resolve, reject) => {
    const db = new sqlite3.Database(config.filename, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
  return _db;
}

// Accessor for modules that don't get `db` threaded through. main.ts opens
// the database before registering the service, so by the time a request
// handler calls getDb() the connection is live.
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

// --- Schema + seed ----------------------------------------------------------
//
// Single idempotent migration. No migration framework — this is a teaching
// recipe. CREATE TABLE IF NOT EXISTS is safe to re-run on every startup;
// the seed below is gated by a COUNT(*) check (INSERT OR IGNORE doesn't help
// when the unique key is AUTOINCREMENT — see the seed block for the
// reasoning).

const SEED_COUNT = 100;

export async function runSchemaMigrations(db: Database): Promise<void> {
  // Records table. id is INTEGER PRIMARY KEY AUTOINCREMENT so it monotonically
  // increases — important for the cursor pattern below, which uses id as the
  // seek key. AUTOINCREMENT (vs implicit ROWID) guarantees ids are never
  // reused even after deletes; recipe doesn't delete rows but this is the
  // production-grade choice.
  await run(db, `
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      label TEXT NOT NULL
    )
  `);
  // No index on id — it's already the primary key, which is implicitly
  // indexed. We only ever query "newest first with id < cursor", which the
  // PK serves directly.

  // Idempotent seed. Check count first because INSERT OR IGNORE doesn't
  // help here — there's no UNIQUE constraint the rows could collide on
  // (id is AUTOINCREMENT, so each insert gets a fresh id). Counting is
  // cheap and unambiguous.
  const existing = await get<{ n: number }>(db, "SELECT COUNT(*) AS n FROM records");
  if ((existing?.n ?? 0) > 0) return;

  // Seed 100 placeholder records. created_at is staggered so each row has
  // a distinct timestamp the test driver can report for diagnostics.
  // Wrapped in a transaction so 100 inserts don't hit 100 fsync flushes.
  await run(db, "BEGIN TRANSACTION");
  try {
    const baseMs = Date.now() - SEED_COUNT * 1000;
    for (let i = 1; i <= SEED_COUNT; i++) {
      const createdAt = new Date(baseMs + i * 1000).toISOString();
      await run(
        db,
        "INSERT INTO records (created_at, label) VALUES (?, ?)",
        [createdAt, `Record ${i}`],
      );
    }
    await run(db, "COMMIT");
  } catch (err) {
    await run(db, "ROLLBACK");
    throw err;
  }
}
