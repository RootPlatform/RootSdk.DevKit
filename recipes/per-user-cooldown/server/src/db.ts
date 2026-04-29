// ============================================================================
// SQLite open + promisified helpers + schema migration.
// Same pattern as prior recipes' db.ts. Only the table differs.
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

/**
 * Like run(), but resolves with the number of rows changed. Used by
 * conditional updates (e.g. the cooldown's atomic check-and-update) to
 * tell whether the WHERE clause allowed the change.
 *
 * Uses `function()` rather than an arrow so sqlite3 can bind `this.changes`.
 */
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

export function get<T>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });
}

// --- Schema ----------------------------------------------------------------

export async function runSchemaMigrations(db: Database): Promise<void> {
  // user_cooldowns: one row per user who has ever claimed. last_claimed_at
  // is unix ms (INTEGER) so SQLite can do arithmetic in the cooldown
  // WHERE clause without timezone conversion. user_id is the natural
  // primary key — at most one row per user, ON CONFLICT(user_id) drives
  // the check-and-update.
  //
  // No seed — the table starts empty and the first claim per user is an
  // INSERT.
  await run(db, `
    CREATE TABLE IF NOT EXISTS user_cooldowns (
      user_id TEXT PRIMARY KEY,
      last_claimed_at INTEGER NOT NULL
    )
  `);
}
