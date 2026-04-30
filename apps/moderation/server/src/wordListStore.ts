import {
  Database,
  all,
  get,
  run,
  runWithChanges,
  runWithLastID,
  transaction,
} from "./db";
import { WordCategory } from "@moderation/gen-shared";
import { compileAlternation, normalize } from "./contentFilter";
import { normalizeDomain } from "./urlFilter";

// Per-category normalization. Word categories use the content-filter
// `normalize()` (lowercase + leet fold + strip non-alphanum). URL_DOMAIN
// can't use that — it would strip the dots — so we hand off to
// normalizeDomain() which preserves hostname shape.
function normalizeForCategory(
  category: WordCategory,
  text: string,
): string | undefined {
  if (category === WordCategory.URL_DOMAIN) {
    return normalizeDomain(text);
  }
  const out = normalize(text);
  return out || undefined;
}

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
// URL_DOMAIN: list of domains for the URL filter. Same row-cache shape
// as the word-list categories. We don't compile a regex here — domain
// matching uses suffix comparison, not substring/alternation regex. See
// urlFilter.ts.
let urlDomainCache: WordRow[] | undefined;

// Compiled-regex cache, mirroring the row cache. Built lazily on first
// read after a row-cache hydrate, invalidated alongside the row cache on
// every mutating write. The matcher uses these directly — see
// messageHandler's content-filter section.
let customPatternCache: RegExp | undefined;
let allowedPatternCache: RegExp | undefined;
let customPatternBuilt = false;
let allowedPatternBuilt = false;

function invalidateCacheFor(category: WordCategory): void {
  if (category === WordCategory.CUSTOM) {
    customCache = undefined;
    customPatternCache = undefined;
    customPatternBuilt = false;
  } else if (category === WordCategory.ALLOWED) {
    allowedCache = undefined;
    allowedPatternCache = undefined;
    allowedPatternBuilt = false;
  } else if (category === WordCategory.URL_DOMAIN) {
    urlDomainCache = undefined;
  }
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
  if (category === WordCategory.URL_DOMAIN) {
    if (!urlDomainCache) {
      urlDomainCache = await loadAll(db, WordCategory.URL_DOMAIN);
    }
    return urlDomainCache.filter((w) => w.enabled).map((w) => w.text);
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
  const normalized = normalizeForCategory(category, text);
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

// Bulk insert. Pre-existing rows are reported as `duplicates`; entries
// that normalize to empty (e.g. just whitespace or punctuation) or
// exceed `maxLength` are reported as `invalid`. Server splits each
// input on commas and newlines so admins can paste a CSV or a list
// in any common shape.
//
// Concurrency: uses `INSERT OR IGNORE` so a concurrent import of the
// same word from another admin session doesn't roll back the entire
// transaction — the unique-index conflict is silently absorbed and we
// recompute the duplicate count from `runWithChanges`. Without this,
// two overlapping bulk imports could blow up the slower one entirely.
//
// Cache is invalidated once at the end (vs. per-row) so the compiled-
// regex pattern recompiles exactly once for the whole import.
//
// Caller (moderationService.importWords) caps `texts.length` at
// IMPORT_MAX_ENTRIES; this function ALSO caps the post-split candidate
// count via MAX_POST_SPLIT_CANDIDATES, since one input string could
// contain many comma-separated pieces. Without that cap a 1MB paste
// with millions of commas would exceed SQLite's 999-parameter limit on
// the IN (...) query.
const MAX_POST_SPLIT_CANDIDATES = 1000;

export class ImportTooLargeError extends Error {
  constructor(public readonly candidateCount: number) {
    super(
      `Too many candidates after split (${candidateCount} > ${MAX_POST_SPLIT_CANDIDATES})`,
    );
    this.name = "ImportTooLargeError";
  }
}

export async function importWords(
  db: Database,
  category: WordCategory,
  texts: readonly string[],
  maxLength: number,
): Promise<{ added: number; duplicates: number; invalid: number }> {
  // Step 1: split each input on commas + newlines, normalize, drop
  // empties / over-length. Keep a Set to dedupe within the input
  // before we hit the DB so we don't double-count duplicates.
  const candidates = new Set<string>();
  let invalid = 0;
  for (const raw of texts) {
    for (const piece of raw.split(/[,\n]/)) {
      const normalized = normalizeForCategory(category, piece);
      if (!normalized) {
        // Empty after normalization is "invalid" only when the input
        // had something — pure whitespace between commas isn't worth
        // counting against the user. For URL_DOMAIN this also catches
        // entries that don't look like domains (no dot, etc).
        if (piece.trim()) invalid += 1;
        continue;
      }
      if (normalized.length > maxLength) {
        invalid += 1;
        continue;
      }
      candidates.add(normalized);
      // Bound here, not after the loop, so we fail fast on a runaway
      // input rather than allocating millions of Set entries first.
      if (candidates.size > MAX_POST_SPLIT_CANDIDATES) {
        throw new ImportTooLargeError(candidates.size);
      }
    }
  }
  if (candidates.size === 0) {
    return { added: 0, duplicates: 0, invalid };
  }

  // Step 2: INSERT OR IGNORE each candidate inside a single transaction.
  // The unique index on (text, category) silently rejects pre-existing
  // rows; runWithChanges tells us whether each row was actually inserted
  // (1) or skipped as a duplicate (0). Compared to a SELECT-then-diff
  // approach this is race-safe — concurrent imports of overlapping words
  // can both run without rolling back each other.
  const candidateList = [...candidates];
  const now = Date.now();
  let added = 0;
  await transaction(db, async () => {
    for (const text of candidateList) {
      const changes = await runWithChanges(
        db,
        `INSERT OR IGNORE INTO words (text, category, enabled, created_at)
         VALUES (?, ?, 1, ?)`,
        [text, category, now],
      );
      if (changes > 0) added += 1;
    }
  });
  if (added > 0) invalidateCacheFor(category);
  return {
    added,
    duplicates: candidateList.length - added,
    invalid,
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

// Returns the compiled-alternation regex for a category's enabled terms,
// or undefined when the list is empty. Cached alongside the row cache —
// invalidation paths in addWord/setWordEnabled/removeWord drop both.
//
// The pattern is plain alternation of escaped terms (no `g`, no `i` flag —
// rules and message text are both pre-normalized to lowercase). Allowed-
// words match-cancellation in contentFilter re-creates a `g`-flagged copy
// for full-text scanning.
export async function getCompiledPattern(
  db: Database,
  category: WordCategory,
): Promise<RegExp | undefined> {
  if (category === WordCategory.CUSTOM) {
    if (customPatternBuilt) return customPatternCache;
    const enabled = await getEnabledWords(db, WordCategory.CUSTOM);
    customPatternCache = compileAlternation(enabled);
    customPatternBuilt = true;
    return customPatternCache;
  }
  if (category === WordCategory.ALLOWED) {
    if (allowedPatternBuilt) return allowedPatternCache;
    const enabled = await getEnabledWords(db, WordCategory.ALLOWED);
    allowedPatternCache = compileAlternation(enabled);
    allowedPatternBuilt = true;
    return allowedPatternCache;
  }
  return undefined;
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
