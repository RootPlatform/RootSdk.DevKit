import { Database, all, get, run, transaction } from "./db";

// ============================================================================
// archiveStore — CRUD on the releases table.
//
// Append-only log, capped globally at 50 most-recent. Older rows are pruned
// inside the same transaction as the insert so the cap holds even under
// concurrent inserts (multiple repos firing polls in the same minute).
//
// The dedupe cursor (used by the poll handler to filter "new since last
// time") is `MAX(id) WHERE owner=? AND name=?`, surfaced via
// `getCursorForRepo`. The COALESCE-to-0 pattern is in this module's helper
// rather than every caller, so a fresh repo (no archive rows yet) returns 0
// and the caller's `id > cursor` filter Just Works.
// ============================================================================

const ARCHIVE_CAP = 50;

// Internal row shape. Matches schema columns directly.
export interface ReleaseRow {
  id: number;
  owner: string;
  name: string;
  tag_name: string;
  release_name: string;
  body: string;
  html_url: string;
  published_at: number;
  prerelease: number;   // 0 | 1
  added_at: number;
}

// Insert one release and prune the global archive to ARCHIVE_CAP entries.
// Wrapped in a transaction so a crash mid-prune doesn't leave the cap
// momentarily violated. Returns the inserted row (with `added_at` set by
// the server) so the caller can broadcast it without re-reading.
export interface NewReleaseFields {
  id: number;
  owner: string;
  name: string;
  tagName: string;
  releaseName: string;
  body: string;
  htmlUrl: string;
  publishedAt: number;
  prerelease: boolean;
}

export async function insertRelease(
  db: Database,
  fields: NewReleaseFields,
): Promise<ReleaseRow> {
  const addedAt = Date.now();
  await transaction(db, async () => {
    await run(
      db,
      `INSERT INTO releases
         (id, owner, name, tag_name, release_name, body, html_url,
          published_at, prerelease, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.id,
        fields.owner,
        fields.name,
        fields.tagName,
        fields.releaseName,
        fields.body,
        fields.htmlUrl,
        fields.publishedAt,
        fields.prerelease ? 1 : 0,
        addedAt,
      ],
    );
    // Prune to ARCHIVE_CAP. The subquery picks the rowids we keep
    // (most-recent by added_at, id desc), and the outer DELETE removes
    // everything else. SQLite handles this efficiently with the
    // idx_releases_feed index.
    await run(
      db,
      `DELETE FROM releases
       WHERE rowid NOT IN (
         SELECT rowid FROM releases
         ORDER BY added_at DESC, id DESC
         LIMIT ?
       )`,
      [ARCHIVE_CAP],
    );
  });
  return {
    id: fields.id,
    owner: fields.owner,
    name: fields.name,
    tag_name: fields.tagName,
    release_name: fields.releaseName,
    body: fields.body,
    html_url: fields.htmlUrl,
    published_at: fields.publishedAt,
    prerelease: fields.prerelease ? 1 : 0,
    added_at: addedAt,
  };
}

// Returns the global feed: most-recent ARCHIVE_CAP releases across all repos,
// ordered `added_at DESC, id DESC`. The `id DESC` tiebreaker matters because
// backfill on add inserts three rows with near-identical `added_at` — we want
// the newest GitHub release at the top within that tied group.
export async function listFeed(db: Database): Promise<ReleaseRow[]> {
  return all<ReleaseRow>(
    db,
    `SELECT id, owner, name, tag_name, release_name, body, html_url,
            published_at, prerelease, added_at
     FROM releases
     ORDER BY added_at DESC, id DESC
     LIMIT ?`,
    [ARCHIVE_CAP],
  );
}

// Returns the dedupe cursor for a repo: the highest release `id` we've
// archived. Returns 0 for a fresh repo (no archive rows). The poll handler
// filters `gh.id > cursor` against this — a fresh repo's cursor of 0
// admits every release returned by GitHub, which is exactly what we want
// for first-poll backfill.
export async function getCursorForRepo(
  db: Database,
  owner: string,
  name: string,
): Promise<number> {
  const row = await get<{ max_id: number | null }>(
    db,
    `SELECT MAX(id) AS max_id
     FROM releases
     WHERE owner = ? AND name = ?`,
    [owner, name],
  );
  return row?.max_id ?? 0;
}

export const archiveCap = ARCHIVE_CAP;
