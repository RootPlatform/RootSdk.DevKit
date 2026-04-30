import { UserGuid, ChannelGuid } from "@rootsdk/server-app";
import { Database, all, get, run, runWithLastID } from "./db";
import { ActionType, RuleType } from "@moderation/gen-shared";
import { log, errFields } from "./lib/log";

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
  // Persisted-at-time-of-action community nickname (what the user was
  // called when this row was written). Frozen on write so a later rename
  // doesn't rewrite history. Resolved via communityMembers.get + cached
  // — see nicknameCache.ts. The user-facing UI labels this "Username".
  targetNickname: string;
  messageExcerpt: string;
  matchedTerm: string;
  manual: boolean;
  actorUserId: UserGuid | "";
  // Frozen-at-write nickname for the admin actor. Empty for automated
  // (rule-pipeline) rows where there's no human actor.
  actorNickname: string;
}

interface DbRow {
  id: number;
  timestamp: number;
  action: number;
  rule: number;
  target_user_id: string;
  channel_id: string;
  target_nickname: string;
  message_excerpt: string;
  matched_term: string;
  manual: number;
  actor_user_id: string;
  actor_nickname: string;
}

function toEntry(r: DbRow): AuditEntryRow {
  return {
    id: r.id,
    timestamp: r.timestamp,
    action: r.action as ActionType,
    rule: r.rule as RuleType,
    targetUserId: r.target_user_id as UserGuid,
    channelId: r.channel_id as ChannelGuid | "",
    targetNickname: r.target_nickname,
    messageExcerpt: r.message_excerpt,
    matchedTerm: r.matched_term,
    manual: r.manual === 1,
    actorUserId: r.actor_user_id as UserGuid | "",
    actorNickname: r.actor_nickname ?? "",
  };
}

export interface AppendInput {
  timestamp: number;
  action: ActionType;
  rule: RuleType;
  targetUserId: UserGuid;
  channelId?: ChannelGuid | "";
  targetNickname?: string;
  messageExcerpt?: string;
  matchedTerm?: string;
  manual?: boolean;
  actorUserId?: UserGuid | "";
  actorNickname?: string;
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
     (timestamp, action, rule, target_user_id, channel_id, target_nickname,
      message_excerpt, matched_term, manual, actor_user_id, actor_nickname)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.timestamp,
      input.action,
      input.rule,
      input.targetUserId,
      input.channelId ?? "",
      input.targetNickname ?? "",
      excerpt,
      input.matchedTerm ?? "",
      input.manual ? 1 : 0,
      input.actorUserId ?? "",
      input.actorNickname ?? "",
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
  // Substring match against the persisted target_nickname (case-
  // insensitive). Mark's product vocabulary calls this "username", but
  // the persisted field is the SDK's `nickname` — see nicknameCache.ts.
  nicknameFilter: string;
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
  // Trim before the truthiness check: a whitespace-only filter like "  "
  // would otherwise pass `if (filters.nicknameFilter)` and produce a
  // `LIKE '%   %'` pattern that scans every row and matches none.
  const trimmedNickname = filters.nicknameFilter.trim();
  if (trimmedNickname) {
    parts.push(`lower(target_nickname) LIKE ?`);
    params.push(`%${trimmedNickname.toLowerCase()}%`);
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
//
// `RuleType.UNSPECIFIED` rows are reserved for rule-pipeline-failure
// records (see messageHandler.logRuleFailure). They show up in the
// AuditLog table so admins can spot internal failures, but they aren't
// real moderation actions — excluded from "Total actions" by default.
// A caller that explicitly passes `RuleType.UNSPECIFIED` as the `rule`
// filter (e.g. to count internal failures) gets exactly that.
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
  } else {
    parts.push(`rule != ?`);
    params.push(RuleType.UNSPECIFIED);
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
// then pivots into the per-rule columns the proto expects. UNSPECIFIED
// rule rows (rule-pipeline-failure records) are excluded so they don't
// pollute analytics — see countSince above.
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
     WHERE timestamp >= ? AND rule != ?
     GROUP BY bucket, rule, manual
     ORDER BY bucket ASC`,
    [bucketMs, bucketMs, sinceMs, RuleType.UNSPECIFIED],
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
    // Exclude UNSPECIFIED rule rows so a channel where rule-pipeline
    // failures happen doesn't get inflated up the top-channels list.
    `SELECT channel_id, COUNT(*) AS n
     FROM audit_log
     WHERE timestamp >= ? AND channel_id != '' AND rule != ?
     GROUP BY channel_id
     ORDER BY n DESC
     LIMIT ?`,
    [sinceMs, RuleType.UNSPECIFIED, limit],
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

// Per-user infraction summary — backs the audit-log row-expand UI.
// Aggregates a single user's audit rows by rule type, plus overall
// total + first/last event timestamps + the user's most-recently-frozen
// nickname. Excludes UNSPECIFIED-rule rows for the same reason
// countSince does — internal-failure rows shouldn't inflate user
// infraction counts.
export interface MemberSummaryRow {
  nickname: string;
  totalEvents: number;
  byRule: { rule: RuleType; count: number }[];
  firstEventAt: number;
  lastEventAt: number;
}

export async function memberSummary(
  db: Database,
  userId: UserGuid,
): Promise<MemberSummaryRow> {
  // Per-rule counts via GROUP BY. Excludes UNSPECIFIED so rule-pipeline-
  // failure rows don't pollute the breakdown.
  const ruleRows = await all<{
    rule: number;
    n: number;
    first_at: number;
    last_at: number;
  }>(
    db,
    `SELECT rule, COUNT(*) AS n, MIN(timestamp) AS first_at, MAX(timestamp) AS last_at
     FROM audit_log
     WHERE target_user_id = ? AND rule != ?
     GROUP BY rule`,
    [userId, RuleType.UNSPECIFIED],
  );
  // Most-recently-frozen nickname for this user. We pick the latest row
  // because nicknames change over time and the most recent one is the
  // most useful display value. Empty when the user has no audit
  // history.
  const nicknameRow = await get<{ target_nickname: string }>(
    db,
    `SELECT target_nickname FROM audit_log
     WHERE target_user_id = ? AND target_nickname != ''
     ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  let totalEvents = 0;
  let firstEventAt = 0;
  let lastEventAt = 0;
  for (const r of ruleRows) {
    totalEvents += r.n;
    if (firstEventAt === 0 || r.first_at < firstEventAt) firstEventAt = r.first_at;
    if (r.last_at > lastEventAt) lastEventAt = r.last_at;
  }
  return {
    nickname: nicknameRow?.target_nickname ?? "",
    totalEvents,
    byRule: ruleRows
      .map((r) => ({ rule: r.rule as RuleType, count: r.n }))
      // Sort by count descending so the most frequent rule reads first
      // in the UI's chip row.
      .sort((a, b) => b.count - a.count),
    firstEventAt,
    lastEventAt,
  };
}

// Type-to-confirm gated bulk delete. Caller validates the typed phrase
// matches; this is just the mechanical purge. Returns rows deleted so the
// RPC can surface the count back to the UI.
export async function deleteAll(db: Database): Promise<number> {
  const before = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM audit_log`,
  );
  await run(db, `DELETE FROM audit_log`);
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
    log("warn", "audit cursor decoded but id field invalid", { cursor });
  } catch (err) {
    // Malformed input — log so an operator-visible signal exists if a
    // client ever loops on a persistently-bad cursor. Falls through to
    // the "treat as first page" return below; the next legitimate
    // request will decode normally.
    log("warn", "audit cursor decode failed", {
      cursor,
      ...errFields(err),
    });
  }
  return Number.MAX_SAFE_INTEGER;
}
