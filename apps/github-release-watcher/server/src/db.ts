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
  // surfaces here at startup rather than on the first query later.
  _db = await new Promise<Database>((resolve, reject) => {
    const db = new sqlite3.Database(config.filename, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });

  // FK constraints are off by default in SQLite. We rely on
  // `releases (owner, name) REFERENCES watched_repos (...) ON DELETE CASCADE`
  // for repo-removal cleanup, so this MUST be on or RemoveRepo would leave
  // orphan archive rows behind. Set on the connection itself, not in the
  // schema, so it's always active including for ad-hoc queries.
  await run(_db, `PRAGMA foreign_keys = ON`);

  return _db;
}

// Accessor for modules that don't get `db` threaded through (service +
// scheduler). Stores always take db as a parameter.
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
// conditional updates to tell whether the WHERE clause allowed the change.
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
//
// Two tables, both relational. No KV-backed settings: every persistent value
// in this app is per-repo (interval, prerelease toggle, last-poll state), so
// every persistent value is relational. See DESIGN.md → Storage shape is
// data-driven, not template-driven.

export async function runSchemaMigrations(db: Database): Promise<void> {
  // watched_repos: one row per repository the community is watching.
  // Persisted only after AddRepo's GitHub validation succeeds — every row
  // here represents a real public GitHub repo at the time it was added.
  // last_poll_status maps to the proto PollStatus enum: 0=UNSPECIFIED,
  // 1=OK, 2=ERROR (matches the wire encoding).
  await run(db, `
    CREATE TABLE IF NOT EXISTS watched_repos (
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      poll_interval_minutes INTEGER NOT NULL,
      include_prereleases INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL,
      last_poll_at INTEGER NOT NULL DEFAULT 0,
      last_poll_status INTEGER NOT NULL DEFAULT 0,
      last_error_message TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (owner, name)
    )
  `);

  // releases: append-only archive, capped globally at 50 most recent.
  // FK ON DELETE CASCADE makes RemoveRepo a single statement (the watched_repos
  // delete fans out to clear this table for that repo). Index covers both the
  // global feed query (added_at + id desc) and the per-repo cursor query
  // (MAX(id) WHERE owner=? AND name=?).
  await run(db, `
    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER NOT NULL,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      release_name TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      html_url TEXT NOT NULL,
      published_at INTEGER NOT NULL,
      prerelease INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (owner, name, id),
      FOREIGN KEY (owner, name) REFERENCES watched_repos(owner, name) ON DELETE CASCADE
    )
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_releases_feed
    ON releases (added_at DESC, id DESC)
  `);
  await run(db, `
    CREATE INDEX IF NOT EXISTS idx_releases_cursor
    ON releases (owner, name, id DESC)
  `);
}
