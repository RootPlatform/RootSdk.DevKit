import { Database, all, get, run, runWithChanges } from "./db";

// ============================================================================
// repoStore — CRUD on the watched_repos table.
//
// Every row in watched_repos represents a real, currently-valid public GitHub
// repository — enforced by AddRepo's validate-before-insert flow. There is
// no "pending" state in the schema: a row exists if and only if validation
// has succeeded for it. See DESIGN.md → Validate-before-persist.
//
// Storage is a thin promisified wrapper. No in-memory cache: the row count
// is small (capped at 10), reads are fast, and a held cache would add
// invalidation work for marginal gain.
// ============================================================================

// Internal row shape — matches the SQLite columns directly. The service layer
// translates this to/from the proto Repo message; keeping the internal shape
// separate means schema changes (column added) don't require touching the
// proto and vice versa.
//
// last_poll_status is encoded as the integer value of the proto PollStatus
// enum (0=UNSPECIFIED, 1=OK, 2=ERROR), so reads of this column can be
// assigned directly to the proto field without translation.
export interface RepoRow {
  owner: string;
  name: string;
  poll_interval_minutes: number;
  include_prereleases: number;  // 0 | 1 (SQLite has no native bool)
  added_at: number;
  last_poll_at: number;          // 0 = never polled
  last_poll_status: number;      // matches PollStatus enum
  last_error_message: string;    // "" when no error
}

export async function listRepos(db: Database): Promise<RepoRow[]> {
  return all<RepoRow>(
    db,
    `SELECT owner, name, poll_interval_minutes, include_prereleases,
            added_at, last_poll_at, last_poll_status, last_error_message
     FROM watched_repos
     ORDER BY added_at ASC`,
  );
}

export async function getRepo(
  db: Database,
  owner: string,
  name: string,
): Promise<RepoRow | undefined> {
  return get<RepoRow>(
    db,
    `SELECT owner, name, poll_interval_minutes, include_prereleases,
            added_at, last_poll_at, last_poll_status, last_error_message
     FROM watched_repos
     WHERE owner = ? AND name = ?`,
    [owner, name],
  );
}

// Returns the count of currently-watched repos. Used by AddRepo's cap check.
// A SELECT COUNT(*) is fine at this scale (capped at 10 rows).
export async function countRepos(db: Database): Promise<number> {
  const row = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM watched_repos`,
  );
  return row?.n ?? 0;
}

// Insert with default per-row state for a newly-validated repo.
//   poll_interval_minutes: caller-provided (typically the server default)
//   include_prereleases:   default false
//   last_poll_*:           defaults from the schema (never polled)
//
// Returns the inserted row; readers should never have to re-query immediately
// after an insert.
export interface NewRepoFields {
  owner: string;
  name: string;
  pollIntervalMinutes: number;
  includePrereleases: boolean;
}

export async function insertRepo(
  db: Database,
  fields: NewRepoFields,
): Promise<RepoRow> {
  const now = Date.now();
  await run(
    db,
    `INSERT INTO watched_repos
       (owner, name, poll_interval_minutes, include_prereleases, added_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      fields.owner,
      fields.name,
      fields.pollIntervalMinutes,
      fields.includePrereleases ? 1 : 0,
      now,
    ],
  );
  return {
    owner: fields.owner,
    name: fields.name,
    poll_interval_minutes: fields.pollIntervalMinutes,
    include_prereleases: fields.includePrereleases ? 1 : 0,
    added_at: now,
    last_poll_at: 0,
    last_poll_status: 0,
    last_error_message: "",
  };
}

// Returns true if a row was actually updated. False means the row was gone
// at write time (deleted concurrently between the service's getRepo check
// and this UPDATE). Same shape as `deleteRepo` so callers can short-circuit
// downstream effects (broadcasts, schedule changes) on a no-op.
export async function updateRepoInterval(
  db: Database,
  owner: string,
  name: string,
  pollIntervalMinutes: number,
): Promise<boolean> {
  const changed = await runWithChanges(
    db,
    `UPDATE watched_repos
     SET poll_interval_minutes = ?
     WHERE owner = ? AND name = ?`,
    [pollIntervalMinutes, owner, name],
  );
  return changed > 0;
}

export async function updateRepoPrerelease(
  db: Database,
  owner: string,
  name: string,
  includePrereleases: boolean,
): Promise<boolean> {
  const changed = await runWithChanges(
    db,
    `UPDATE watched_repos
     SET include_prereleases = ?
     WHERE owner = ? AND name = ?`,
    [includePrereleases ? 1 : 0, owner, name],
  );
  return changed > 0;
}

// Update the per-row state recorded after each poll attempt. Called from
// pollJobs.onJob. `lastPollAt` is set unconditionally — successful or failed
// — so a forever-failing repo's `last_poll_at` still ticks forward,
// indicating the watcher IS reaching it (it just keeps getting errors).
export async function updateRepoPollState(
  db: Database,
  owner: string,
  name: string,
  lastPollAt: number,
  lastPollStatus: number,
  lastErrorMessage: string,
): Promise<void> {
  await run(
    db,
    `UPDATE watched_repos
     SET last_poll_at = ?, last_poll_status = ?, last_error_message = ?
     WHERE owner = ? AND name = ?`,
    [lastPollAt, lastPollStatus, lastErrorMessage, owner, name],
  );
}

// Delete a watched repo. The FK ON DELETE CASCADE on `releases` clears the
// archive entries in the same transaction. Returns true if a row was actually
// deleted (used by callers to decide whether to fire the cleanup broadcasts).
export async function deleteRepo(
  db: Database,
  owner: string,
  name: string,
): Promise<boolean> {
  const changed = await runWithChanges(
    db,
    `DELETE FROM watched_repos WHERE owner = ? AND name = ?`,
    [owner, name],
  );
  return changed > 0;
}

// Returns the most recent successful poll timestamp across all repos, or 0
// if nothing has polled successfully yet. Drives the home view header's
// "last poll {relative}" timestamp — see DESIGN.md → Release feed.
export async function getMostRecentSuccessfulPoll(db: Database): Promise<number> {
  const row = await get<{ ts: number | null }>(
    db,
    `SELECT MAX(last_poll_at) AS ts
     FROM watched_repos
     WHERE last_poll_status = 1`,  // 1 = OK
  );
  return row?.ts ?? 0;
}
