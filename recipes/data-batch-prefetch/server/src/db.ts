// ============================================================================
// SQLite open + promisified helpers + schema migration + seed.
// Same shape as the prior recipes' db.ts. Two seeded tables: activities and
// owners, with activities referencing owners by string id (no FK constraint
// — kept loose so the recipe demonstrates "reference exists in domain but
// not enforced at the storage layer", which is realistic for cross-app or
// cross-namespace references).
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

// --- Seeded data shape (recipe placeholder) --------------------------------

// 5 owners, cycling through a small palette. Real recipes substitute
// real actor identifiers (user ids, repo full names, etc.) and real
// display data (usernames, avatars, etc.).
const SEED_OWNERS: ReadonlyArray<{ id: string; display_name: string; color: string }> = [
  { id: "owner-1", display_name: "Owner One",   color: "#3B82F6" }, // blue
  { id: "owner-2", display_name: "Owner Two",   color: "#10B981" }, // green
  { id: "owner-3", display_name: "Owner Three", color: "#F59E0B" }, // amber
  { id: "owner-4", display_name: "Owner Four",  color: "#EF4444" }, // red
  { id: "owner-5", display_name: "Owner Five",  color: "#8B5CF6" }, // violet
];

// 10 activities, cycling through the 5 owners. Two activities per owner
// gives a 2× dedup ratio that's visible in the harness assertions and
// the client UI. The action verbs are placeholder; replace with whatever
// matches your domain.
const SEED_ACTIONS: ReadonlyArray<string> = [
  "joined", "posted", "edited", "deleted", "archived",
  "joined", "posted", "edited", "deleted", "archived",
];

// --- Schema + seed ---------------------------------------------------------

export async function runSchemaMigrations(db: Database): Promise<void> {
  // owners: a small registry of identities the activities reference.
  await run(db, `
    CREATE TABLE IF NOT EXISTS owners (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `);

  // activities: list of events. actor_id is TEXT to mirror real-world
  // foreign-key shapes (string ids, no FK enforcement so deleted owners
  // don't break existing rows — the recipe contract is "missing owner
  // becomes 'unknown' on the client").
  await run(db, `
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL
    )
  `);

  // Index the sort + filter columns the list query touches.
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_activities_occurred_at
    ON activities (occurred_at DESC, id DESC)
  `);

  // Idempotent seed gated by COUNT — same pattern as data-paginated-list.
  // INSERT OR IGNORE doesn't help here for activities (id is AUTOINCREMENT
  // so each insert gets a fresh id and never collides). It DOES help for
  // owners (id is the PK), but checking count + bulk inserting is simpler
  // than mixing semantics across tables.
  const existingActivities = await get<{ n: number }>(db, "SELECT COUNT(*) AS n FROM activities");
  if ((existingActivities?.n ?? 0) > 0) return;

  await run(db, "BEGIN TRANSACTION");
  try {
    for (const owner of SEED_OWNERS) {
      await run(
        db,
        `INSERT OR IGNORE INTO owners (id, display_name, color) VALUES (?, ?, ?)`,
        [owner.id, owner.display_name, owner.color],
      );
    }
    const baseMs = Date.now() - SEED_ACTIONS.length * 60_000; // 1-min apart
    for (let i = 0; i < SEED_ACTIONS.length; i++) {
      const owner = SEED_OWNERS[i % SEED_OWNERS.length];
      const occurredAt = new Date(baseMs + i * 60_000).toISOString();
      await run(
        db,
        `INSERT INTO activities (action, actor_id, occurred_at) VALUES (?, ?, ?)`,
        [SEED_ACTIONS[i], owner.id, occurredAt],
      );
    }
    await run(db, "COMMIT");
  } catch (err) {
    await run(db, "ROLLBACK");
    throw err;
  }
}
