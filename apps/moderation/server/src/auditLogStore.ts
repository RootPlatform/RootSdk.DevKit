import { UserGuid, ChannelGuid } from "@rootsdk/server-app";
import { Database, all, get, run, runWithLastID } from "./db";
import { ActionType, RuleType } from "@moderation/gen-shared";

// auditLogStore — append + paginated query of audit_log rows.
//
// Cursor encoding: opaque base64 of `{ id }`. The client never decodes it.
// First page is signalled by an empty cursor; the server seeds the seek
// bound to Number.MAX_SAFE_INTEGER so the SQL shape is identical for every
// page (see recipes/data-paginated-list).

export interface AuditEntryRow {
  id: number;
  timestamp: number;
  action: ActionType;
  rule: RuleType;
  targetUserId: UserGuid;
  channelId: ChannelGuid | "";
  targetUsername: string;
  messageExcerpt: string;
  matchedTerm: string;
  manual: boolean;
  actorUserId: UserGuid | "";
}

interface DbRow {
  id: number;
  timestamp: number;
  action: number;
  rule: number;
  target_user_id: string;
  channel_id: string;
  target_username: string;
  message_excerpt: string;
  matched_term: string;
  manual: number;
  actor_user_id: string;
}

function toEntry(r: DbRow): AuditEntryRow {
  return {
    id: r.id,
    timestamp: r.timestamp,
    action: r.action as ActionType,
    rule: r.rule as RuleType,
    targetUserId: r.target_user_id as UserGuid,
    channelId: r.channel_id as ChannelGuid | "",
    targetUsername: r.target_username,
    messageExcerpt: r.message_excerpt,
    matchedTerm: r.matched_term,
    manual: r.manual === 1,
    actorUserId: r.actor_user_id as UserGuid | "",
  };
}

export interface AppendInput {
  timestamp: number;
  action: ActionType;
  rule: RuleType;
  targetUserId: UserGuid;
  channelId?: ChannelGuid | "";
  targetUsername?: string;
  messageExcerpt?: string;
  matchedTerm?: string;
  manual?: boolean;
  actorUserId?: UserGuid | "";
}

const EXCERPT_MAX = 200;

export async function append(
  db: Database,
  input: AppendInput,
): Promise<number> {
  const excerpt = (input.messageExcerpt ?? "").slice(0, EXCERPT_MAX);
  return runWithLastID(
    db,
    `INSERT INTO audit_log
     (timestamp, action, rule, target_user_id, channel_id, target_username,
      message_excerpt, matched_term, manual, actor_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.timestamp,
      input.action,
      input.rule,
      input.targetUserId,
      input.channelId ?? "",
      input.targetUsername ?? "",
      excerpt,
      input.matchedTerm ?? "",
      input.manual ? 1 : 0,
      input.actorUserId ?? "",
    ],
  );
}

export async function getById(
  db: Database,
  id: number,
): Promise<AuditEntryRow | undefined> {
  const row = await get<DbRow>(db, `SELECT * FROM audit_log WHERE id = ?`, [id]);
  return row ? toEntry(row) : undefined;
}

export interface ListFilters {
  usernameFilter: string;
  actionFilter: ActionType;
  ruleFilter: RuleType;
  fromTimestamp: number;
  toTimestamp: number;
}

interface BuiltWhere {
  clause: string;
  params: unknown[];
}

function buildWhere(
  filters: ListFilters,
  cursorId: number | undefined,
): BuiltWhere {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (cursorId !== undefined) {
    parts.push(`id < ?`);
    params.push(cursorId);
  }
  if (filters.usernameFilter) {
    parts.push(`lower(target_username) LIKE ?`);
    params.push(`%${filters.usernameFilter.toLowerCase()}%`);
  }
  if (filters.actionFilter) {
    parts.push(`action = ?`);
    params.push(filters.actionFilter);
  }
  if (filters.ruleFilter) {
    parts.push(`rule = ?`);
    params.push(filters.ruleFilter);
  }
  if (filters.fromTimestamp > 0) {
    parts.push(`timestamp >= ?`);
    params.push(filters.fromTimestamp);
  }
  if (filters.toTimestamp > 0) {
    parts.push(`timestamp < ?`);
    params.push(filters.toTimestamp);
  }
  return {
    clause: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    params,
  };
}

export async function list(
  db: Database,
  filters: ListFilters,
  cursorId: number,
  pageSize: number,
): Promise<{ entries: AuditEntryRow[]; hasMore: boolean }> {
  const { clause, params } = buildWhere(filters, cursorId);
  params.push(pageSize + 1);
  const rows = await all<DbRow>(
    db,
    `SELECT * FROM audit_log ${clause} ORDER BY id DESC LIMIT ?`,
    params,
  );
  const hasMore = rows.length > pageSize;
  const trimmed = hasMore ? rows.slice(0, pageSize) : rows;
  return { entries: trimmed.map(toEntry), hasMore };
}

export async function count(
  db: Database,
  filters: ListFilters,
): Promise<number> {
  const { clause, params } = buildWhere(filters, undefined);
  const row = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM audit_log ${clause}`,
    params,
  );
  return row?.n ?? 0;
}

// Returns the most recent N entries unconditionally — used by the dashboard's
// recent-events panel. Faster than going through list() with empty filters
// because it skips the dynamic WHERE-builder.
export async function recent(
  db: Database,
  limit: number,
): Promise<AuditEntryRow[]> {
  const rows = await all<DbRow>(
    db,
    `SELECT * FROM audit_log ORDER BY id DESC LIMIT ?`,
    [limit],
  );
  return rows.map(toEntry);
}

// Aggregates for the dashboard summary cards. One query per card so each
// can use its own filtered COUNT without a giant CASE expression.
export async function countSince(
  db: Database,
  sinceMs: number,
  rule?: RuleType,
  manual?: boolean,
): Promise<number> {
  const parts: string[] = [`timestamp >= ?`];
  const params: unknown[] = [sinceMs];
  if (rule !== undefined) {
    parts.push(`rule = ?`);
    params.push(rule);
  }
  if (manual !== undefined) {
    parts.push(`manual = ?`);
    params.push(manual ? 1 : 0);
  }
  const row = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM audit_log WHERE ${parts.join(" AND ")}`,
    params,
  );
  return row?.n ?? 0;
}

export interface BucketRow {
  bucket: number;
  rule: RuleType;
  manual: boolean;
  n: number;
}

// Group audit entries into time buckets by floor(timestamp / bucketMs) *
// bucketMs. SQLite arithmetic handles this in one pass; the server caller
// then pivots into the per-rule columns the proto expects.
export async function bucketize(
  db: Database,
  sinceMs: number,
  bucketMs: number,
): Promise<BucketRow[]> {
  const rows = await all<{
    bucket: number;
    rule: number;
    manual: number;
    n: number;
  }>(
    db,
    `SELECT
       (timestamp / ?) * ? AS bucket,
       rule,
       manual,
       COUNT(*) AS n
     FROM audit_log
     WHERE timestamp >= ?
     GROUP BY bucket, rule, manual
     ORDER BY bucket ASC`,
    [bucketMs, bucketMs, sinceMs],
  );
  return rows.map((r) => ({
    bucket: r.bucket,
    rule: r.rule as RuleType,
    manual: r.manual === 1,
    n: r.n,
  }));
}

export interface ChannelCount {
  channelId: ChannelGuid;
  count: number;
}

export async function topChannels(
  db: Database,
  sinceMs: number,
  limit: number,
): Promise<ChannelCount[]> {
  const rows = await all<{ channel_id: string; n: number }>(
    db,
    `SELECT channel_id, COUNT(*) AS n
     FROM audit_log
     WHERE timestamp >= ? AND channel_id != ''
     GROUP BY channel_id
     ORDER BY n DESC
     LIMIT ?`,
    [sinceMs, limit],
  );
  return rows.map((r) => ({
    channelId: r.channel_id as ChannelGuid,
    count: r.n,
  }));
}

// Retention pruning. Called daily by the cleanup job and immediately when
// the retention setting changes. Returns rows deleted.
export async function pruneOlderThan(
  db: Database,
  cutoffMs: number,
): Promise<number> {
  const before = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM audit_log WHERE timestamp < ?`,
    [cutoffMs],
  );
  await run(db, `DELETE FROM audit_log WHERE timestamp < ?`, [cutoffMs]);
  return before?.n ?? 0;
}

// Cursor encoding helpers — opaque base64 JSON. Identical pattern to
// recipes/data-paginated-list.

interface Cursor {
  id: number;
}

export function encodeCursor(lastId: number): string {
  return Buffer.from(JSON.stringify({ id: lastId } satisfies Cursor)).toString(
    "base64",
  );
}

export function decodeCursor(cursor: string): number {
  if (!cursor) return Number.MAX_SAFE_INTEGER;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const payload = JSON.parse(json) as Cursor;
    if (typeof payload.id === "number" && Number.isFinite(payload.id)) {
      return payload.id;
    }
  } catch {
    // Malformed → first page.
  }
  return Number.MAX_SAFE_INTEGER;
}
