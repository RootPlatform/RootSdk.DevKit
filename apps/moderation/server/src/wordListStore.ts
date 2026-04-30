import {
  Database,
  all,
  get,
  run,
  runWithChanges,
  runWithLastID,
} from "./db";
import { WordCategory } from "@moderation/gen-shared";
import { normalize } from "./contentFilter";

// wordListStore — custom + allowed word lists. Both share the `words` table
// and split on the `category` column.
//
// In-memory caches: the message handler reads on every eligible message, so
// a per-message DB SELECT would be wasteful. Caches are invalidated on
// every write. Single-process app — no cross-instance coherence concern.

export interface WordRow {
  id: number;
  text: string;
  category: WordCategory;
  enabled: boolean;
  createdAt: number;
}

interface DbRow {
  id: number;
  text: string;
  category: number;
  enabled: number;
  created_at: number;
}

function toRow(r: DbRow): WordRow {
  return {
    id: r.id,
    text: r.text,
    category: r.category as WordCategory,
    enabled: r.enabled === 1,
    createdAt: r.created_at,
  };
}

let customCache: WordRow[] | undefined;
let allowedCache: WordRow[] | undefined;

function invalidateCacheFor(category: WordCategory): void {
  if (category === WordCategory.CUSTOM) customCache = undefined;
  else if (category === WordCategory.ALLOWED) allowedCache = undefined;
}

async function loadAll(db: Database, category: WordCategory): Promise<WordRow[]> {
  const rows = await all<DbRow>(
    db,
    `SELECT id, text, category, enabled, created_at
     FROM words
     WHERE category = ?
     ORDER BY id DESC`,
    [category],
  );
  return rows.map(toRow);
}

// Primary read for the message handler. Returns only enabled rows so the
// matcher can iterate without re-filtering. Cached.
export async function getEnabledWords(
  db: Database,
  category: WordCategory,
): Promise<string[]> {
  if (category === WordCategory.CUSTOM) {
    if (!customCache) customCache = await loadAll(db, WordCategory.CUSTOM);
    return customCache.filter((w) => w.enabled).map((w) => w.text);
  }
  if (category === WordCategory.ALLOWED) {
    if (!allowedCache) allowedCache = await loadAll(db, WordCategory.ALLOWED);
    return allowedCache.filter((w) => w.enabled).map((w) => w.text);
  }
  return [];
}

export async function listWords(
  db: Database,
  category: WordCategory,
  search: string,
  cursorId: number,
  pageSize: number,
): Promise<{ rows: WordRow[]; hasMore: boolean }> {
  const trimmed = search.trim().toLowerCase();
  const params: unknown[] = [category, cursorId];
  let where = `category = ? AND id < ?`;
  if (trimmed) {
    where += ` AND lower(text) LIKE ?`;
    params.push(`%${trimmed}%`);
  }
  params.push(pageSize + 1);
  const rows = await all<DbRow>(
    db,
    `SELECT id, text, category, enabled, created_at
     FROM words
     WHERE ${where}
     ORDER BY id DESC
     LIMIT ?`,
    params,
  );
  const hasMore = rows.length > pageSize;
  const trimmedRows = hasMore ? rows.slice(0, pageSize) : rows;
  return { rows: trimmedRows.map(toRow), hasMore };
}

export async function countWords(
  db: Database,
  category: WordCategory,
  search: string,
): Promise<number> {
  const trimmed = search.trim().toLowerCase();
  const params: unknown[] = [category];
  let where = `category = ?`;
  if (trimmed) {
    where += ` AND lower(text) LIKE ?`;
    params.push(`%${trimmed}%`);
  }
  const row = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM words WHERE ${where}`,
    params,
  );
  return row?.n ?? 0;
}

export async function totalCount(
  db: Database,
  category: WordCategory,
): Promise<number> {
  const row = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM words WHERE category = ?`,
    [category],
  );
  return row?.n ?? 0;
}

// Returns the inserted row, or undefined if a duplicate already existed.
// Duplicates are detected by the unique index on (text, category).
export async function addWord(
  db: Database,
  category: WordCategory,
  text: string,
): Promise<WordRow | undefined> {
  const normalized = normalize(text);
  if (!normalized) return undefined;
  const now = Date.now();
  // Use a probe SELECT before the INSERT so we can return undefined for
  // duplicates without relying on catching a constraint exception.
  const existing = await get<DbRow>(
    db,
    `SELECT id, text, category, enabled, created_at
     FROM words WHERE text = ? AND category = ?`,
    [normalized, category],
  );
  if (existing) return toRow(existing);
  const id = await runWithLastID(
    db,
    `INSERT INTO words (text, category, enabled, created_at)
     VALUES (?, ?, 1, ?)`,
    [normalized, category, now],
  );
  invalidateCacheFor(category);
  return {
    id,
    text: normalized,
    category,
    enabled: true,
    createdAt: now,
  };
}

export async function setWordEnabled(
  db: Database,
  id: number,
  enabled: boolean,
): Promise<WordRow | undefined> {
  await run(
    db,
    `UPDATE words SET enabled = ? WHERE id = ?`,
    [enabled ? 1 : 0, id],
  );
  const row = await get<DbRow>(
    db,
    `SELECT id, text, category, enabled, created_at FROM words WHERE id = ?`,
    [id],
  );
  if (!row) return undefined;
  invalidateCacheFor(row.category as WordCategory);
  return toRow(row);
}

// Returns the deleted row's category so the caller can invalidate caches
// even though we can't trust id alone (the row could already be gone).
export async function removeWord(
  db: Database,
  id: number,
): Promise<WordCategory | undefined> {
  const row = await get<DbRow>(
    db,
    `SELECT category FROM words WHERE id = ?`,
    [id],
  );
  if (!row) return undefined;
  const changes = await runWithChanges(
    db,
    `DELETE FROM words WHERE id = ?`,
    [id],
  );
  if (changes === 0) return undefined;
  invalidateCacheFor(row.category as WordCategory);
  return row.category as WordCategory;
}
