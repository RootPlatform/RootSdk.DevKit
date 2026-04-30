import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  moderationServiceClient,
  ModerationServiceClientEvent,
} from "@moderation/gen-client";
import {
  AuditEntry,
  ActionType,
  RuleType,
  GetMemberSummaryResponse,
} from "@moderation/gen-shared";
import { ChevronDown, ChevronRight, Clock, Search } from "lucide-react";

// Per-user summary type. Aliased to the proto response so the cache
// shape stays in lockstep with the wire shape.
type MemberSummary = GetMemberSummaryResponse;
import { withClientRetry } from "../lib/retry";
import { formatAbsolute, formatRelative } from "../lib/format";
import styles from "./AuditLog.module.css";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { Badge, BadgeVariant } from "../components/Badge";
import { Pill } from "../components/Pill";
import { Select } from "../components/Select";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { MemberActions } from "../components/MemberActions";
import { useAdmin } from "../contexts/AdminContext";

// Audit log — admin-only paginated table with filters. Each filter change
// resets pagination. AuditLogAppended broadcasts surface a "new activity —
// refresh" affordance rather than auto-prepending; auto-prepend would
// shift offsets for users mid-read.

interface Filters {
  username: string;
  action: ActionType;
  rule: RuleType;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: Filters = {
  username: "",
  action: ActionType.UNSPECIFIED,
  rule: RuleType.UNSPECIFIED,
  fromDate: "",
  toDate: "",
};

function isFilterActive(f: Filters): boolean {
  return (
    f.username !== "" ||
    f.action !== ActionType.UNSPECIFIED ||
    f.rule !== RuleType.UNSPECIFIED ||
    f.fromDate !== "" ||
    f.toDate !== ""
  );
}

// Filter labels are past-tense ("Member kicked", not "Kick") so the
// dropdown reads as a list of categories to filter against, not as a
// menu of actions you could take. The table column below renders the
// SAME ActionType via actionLabel() in lowercase imperative form
// ("kick"), which reads naturally as an audit-log line. The two
// representations are visually separate (filter at top, table below)
// and never sit side-by-side, so the grammatical mismatch is invisible.
//
// CLEAR_AUDIT_LOG is intentionally absent from this list. At most one
// such row exists in the log at any time (the meta-row written
// immediately after a clear); filtering for it produces a list of
// length ≤1 with zero practical utility, while the option's verbatim
// match with the destructive button copy in General → Danger zone
// caused the affordance/filter confusion that motivated this layout.
// Rows of that type still render via actionLabel() in the table.
const ACTION_OPTIONS = [
  { value: ActionType.UNSPECIFIED, label: "All actions" },
  { value: ActionType.DELETE_MESSAGE, label: "Message deleted" },
  { value: ActionType.KICK, label: "Member kicked" },
  { value: ActionType.BAN, label: "Member banned" },
  { value: ActionType.UNBAN_MEMBER, label: "Member unbanned" },
];
const RULE_OPTIONS = [
  { value: RuleType.UNSPECIFIED, label: "All rules" },
  { value: RuleType.CONTENT_FILTER, label: "Content filter" },
  { value: RuleType.SPAM_DETECTION, label: "Spam detection" },
  { value: RuleType.RATE_LIMIT, label: "Rate limit" },
  { value: RuleType.USERNAME_FILTER, label: "Username filter" },
  { value: RuleType.URL_FILTER, label: "URL filter" },
  { value: RuleType.NEW_MEMBER_GATE, label: "New member gate" },
  { value: RuleType.MENTION_SPAM, label: "Mention spam" },
  { value: RuleType.MANUAL, label: "Manual" },
];

export const AuditLog: React.FC = () => {
  const { amIAdmin } = useAdmin();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [hasNew, setHasNew] = useState(false);
  // Set of audit-row IDs whose chevron is expanded showing the per-user
  // summary. Multi-expand allowed — admins occasionally want to compare
  // two users' histories side by side.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Per-user summary cache. Keyed by userId, not row id, so multiple
  // rows for the same user share one fetch. Cleared on AuditLogAppended
  // so a fresh moderation event invalidates any displayed counts.
  const summaryCacheRef = useRef<Map<string, MemberSummary>>(new Map());
  const toggleExpand = useCallback((rowId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);
  // Sequence number gates stale responses when filters change rapidly.
  const seqRef = useRef(0);

  const fetchPage = useCallback(
    async (cursorArg: string, replace: boolean) => {
      const mySeq = ++seqRef.current;
      setLoading(true);
      try {
        const fromTs = filters.fromDate
          ? new Date(filters.fromDate).getTime()
          : 0;
        const toTs = filters.toDate ? new Date(filters.toDate).getTime() : 0;
        const r = await withClientRetry(() =>
          moderationServiceClient.listAuditLog({
            cursor: cursorArg,
            pageSize: 25,
            nicknameFilter: filters.username,
            actionFilter: filters.action,
            ruleFilter: filters.rule,
            fromTimestamp: BigInt(fromTs),
            toTimestamp: BigInt(toTs),
          }),
        );
        if (mySeq !== seqRef.current) return;
        setEntries((prev) => (replace ? r.entries : [...prev, ...r.entries]));
        setCursor(r.nextCursor);
        setTotal(r.totalMatches);
        setError(undefined);
      } catch (err) {
        if (mySeq !== seqRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mySeq === seqRef.current) setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void fetchPage("", true);
    setHasNew(false);
  }, [fetchPage]);

  useEffect(() => {
    const onAppended = () => {
      setHasNew(true);
      // A new audit row likely changes some user's totals — drop the
      // summary cache so re-expanded rows refetch fresh data.
      summaryCacheRef.current.clear();
    };
    moderationServiceClient.on(
      ModerationServiceClientEvent.AuditLogAppended,
      onAppended,
    );
    return () => {
      moderationServiceClient.off(
        ModerationServiceClientEvent.AuditLogAppended,
        onAppended,
      );
    };
  }, []);

  if (!amIAdmin) {
    return <div className={styles.empty}>Admin access required.</div>;
  }

  const refresh = () => {
    setHasNew(false);
    void fetchPage("", true);
  };

  const filterActive = isFilterActive(filters);

  return (
    <div className={styles.audit}>
      <header className={styles.heading}>
        <h2 className={styles.title}>Audit log</h2>
        <p className={styles.subtitle}>
          {total} total {total === 1 ? "entry" : "entries"}
        </p>
      </header>

      <Panel
        title="All actions"
        action={
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.filterButton}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <Search size={14} />
              Filters
              {filterActive && <span className={styles.filterButtonDot} />}
            </button>
          </div>
        }
        bodyPadding="flush"
      >
        {filtersOpen && (
          <div className={styles.filters}>
            <Field label="Username">
              <input
                className={styles.input}
                type="text"
                value={filters.username}
                placeholder="Search…"
                onChange={(e) =>
                  setFilters({ ...filters, username: e.target.value })
                }
              />
            </Field>
            <Select
              label="Action"
              value={filters.action}
              options={ACTION_OPTIONS}
              onChange={(v) => setFilters({ ...filters, action: v })}
            />
            <Select
              label="Rule"
              value={filters.rule}
              options={RULE_OPTIONS}
              onChange={(v) => setFilters({ ...filters, rule: v })}
            />
            <Field label="From">
              <input
                className={styles.input}
                type="datetime-local"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
              />
            </Field>
            <Field label="To">
              <input
                className={styles.input}
                type="datetime-local"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
              />
            </Field>
          </div>
        )}

        <div className={styles.summary}>
          <span>
            {total} {total === 1 ? "match" : "matches"}
            {entries.length < total ? ` · showing ${entries.length}` : ""}
          </span>
          {hasNew && (
            <Button variant="primary" onClick={refresh}>
              New activity — refresh
            </Button>
          )}
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {entries.length === 0 ? (
          loading ? (
            <Loader />
          ) : (
            <EmptyState
              icon={<Search size={48} />}
              title="No matching entries"
              body={
                filterActive
                  ? "Try clearing or relaxing the filters above."
                  : "When the moderation pipeline acts on a message, an entry shows up here."
              }
            />
          )
        ) : (
          <>
            {/* Desktop / wide-tablet: classic 7-col table. CSS-gated to
                ≥640px viewport. The min-width on .table forces a
                horizontal scrollbar inside .tableWrap if a narrow
                desktop-style window happens to be below the table's
                natural width. */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {/* Chevron column — empty header. Same shape as
                        github-release-watcher's RepoRow Preview chevron.
                        Per-row Kick/Ban affordances live INSIDE the
                        expanded drawer (alongside the user's history)
                        rather than in a dedicated column. The audit log
                        is read-mostly; surfacing destructive controls
                        on every row added clutter and produced an
                        Action / Actions column-name collision. The
                        Dashboard's Recent activity panel still surfaces
                        them inline since that's the live-triage surface. */}
                    <th className={styles.expandCell} aria-label="Expand"></th>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Rule</th>
                    <th>Matched</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const rowId = e.id.toString();
                    return (
                      <Row
                        key={rowId}
                        entry={e}
                        onActed={refresh}
                        expanded={expanded.has(rowId)}
                        onToggleExpand={() => toggleExpand(rowId)}
                        summaryCache={summaryCacheRef}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile: stacked cards. Same data, no horizontal scroll.
                CSS-gated to <640px so the two renderings never both show. */}
            <div className={styles.cardList}>
              {entries.map((e) => {
                const rowId = e.id.toString();
                return (
                  <RowCard
                    key={rowId}
                    entry={e}
                    onActed={refresh}
                    expanded={expanded.has(rowId)}
                    onToggleExpand={() => toggleExpand(rowId)}
                    summaryCache={summaryCacheRef}
                  />
                );
              })}
            </div>
          </>
        )}
      </Panel>

      {cursor && entries.length > 0 && (
        <div className={styles.loadMoreRow}>
          <Button
            disabled={loading}
            onClick={() => void fetchPage(cursor, false)}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className={styles.filterField}>
    <span className={styles.filterLabel}>{label}</span>
    {children}
  </div>
);

interface RowProps {
  entry: AuditEntry;
  onActed: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  summaryCache: React.MutableRefObject<Map<string, MemberSummary>>;
}

const Row: React.FC<RowProps> = ({
  entry,
  onActed,
  expanded,
  onToggleExpand,
  summaryCache,
}) => {
  const ts = Number(entry.timestamp);
  // Chevron only shows when there's a target user — system-actor rows
  // (CLEAR_AUDIT_LOG) have nothing to drill into.
  const canExpand = !!entry.targetUserId;
  return (
    <>
      <tr>
        <td className={styles.expandCell}>
          {canExpand && (
            <button
              type="button"
              className={styles.expandButton}
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse user history" : "Expand user history"}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </td>
        <td>
          <span className={styles.timeCell} title={formatAbsolute(ts)}>
            <Clock size={12} />
            {formatRelative(ts)}
          </span>
        </td>
      <td>
        <Badge variant={actionVariant(entry.action)}>
          {actionLabel(entry.action)}
        </Badge>
      </td>
      <td className={styles.target}>
        {entry.targetUserId ? (
          <strong>{entry.targetNickname || shortId(entry.targetUserId)}</strong>
        ) : entry.actorUserId ? (
          // System-actor events (e.g. CLEAR_AUDIT_LOG) have no target;
          // surface the admin actor instead so the row is self-explaining.
          <span className={styles.targetIn}>
            by{" "}
            <strong>
              {entry.actorNickname || shortId(entry.actorUserId)}
            </strong>
          </span>
        ) : (
          <span className={styles.targetIn}>—</span>
        )}
        {entry.channelName && (
          <>
            <span className={styles.targetIn}>in</span>
            <Pill prefix="#">{entry.channelName}</Pill>
          </>
        )}
      </td>
      <td>
        <Badge variant="default">{ruleLabel(entry.rule)}</Badge>
      </td>
      <td>
        <span className={styles.matchedCell}>
          {entry.matchedTerm ? <Pill>{entry.matchedTerm}</Pill> : "—"}
        </span>
      </td>
      <td>
        <Badge variant={entry.manual ? "info" : "default"}>
          {entry.manual ? "manual" : "auto"}
        </Badge>
      </td>
    </tr>
    {expanded && entry.targetUserId && (
      <tr className={styles.expandRow}>
        {/* colSpan covers all 7 table columns — chevron + 6 data cells. */}
        <td colSpan={7} className={styles.expandCellInner}>
          <MemberSummaryView
            userId={entry.targetUserId}
            nickname={entry.targetNickname}
            cache={summaryCache}
            onActed={onActed}
          />
        </td>
      </tr>
    )}
    </>
  );
};

// Mobile card variant of an audit row. Same fields the table row carries,
// stacked vertically so a narrow viewport can render every cell without
// horizontal scroll. Used alongside the table; CSS gates which one shows.
const RowCard: React.FC<RowProps> = ({
  entry,
  onActed,
  expanded,
  onToggleExpand,
  summaryCache,
}) => {
  const ts = Number(entry.timestamp);
  const canExpand = !!entry.targetUserId;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        {canExpand && (
          <button
            type="button"
            className={styles.expandButton}
            onClick={onToggleExpand}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse user history" : "Expand user history"}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        <Badge variant={actionVariant(entry.action)}>
          {actionLabel(entry.action)}
        </Badge>
        <Badge variant={entry.manual ? "info" : "default"}>
          {entry.manual ? "manual" : "auto"}
        </Badge>
        <span className={styles.cardTime} title={formatAbsolute(ts)}>
          <Clock size={12} />
          {formatRelative(ts)}
        </span>
      </div>
      <div className={styles.cardTarget}>
        {entry.targetUserId ? (
          <strong>{entry.targetNickname || shortId(entry.targetUserId)}</strong>
        ) : entry.actorUserId ? (
          <span className={styles.cardBy}>
            by{" "}
            <strong>
              {entry.actorNickname || shortId(entry.actorUserId)}
            </strong>
          </span>
        ) : (
          <span className={styles.cardBy}>—</span>
        )}
        {entry.channelName && (
          <>
            <span className={styles.cardIn}>in</span>
            <Pill prefix="#">{entry.channelName}</Pill>
          </>
        )}
      </div>
      <div className={styles.cardMeta}>
        <Badge variant="default">{ruleLabel(entry.rule)}</Badge>
        {entry.matchedTerm && <Pill>{entry.matchedTerm}</Pill>}
      </div>
      {expanded && entry.targetUserId && (
        <div className={styles.cardSummary}>
          <MemberSummaryView
            userId={entry.targetUserId}
            nickname={entry.targetNickname}
            cache={summaryCache}
            onActed={onActed}
          />
        </div>
      )}
    </div>
  );
};

// Per-user summary view rendered inside an expanded row (table) or
// expanded card (mobile). Fetches on first render for a given userId
// and caches the result in the parent's ref-Map so re-expanding the
// same user — even from a different row — is instant. The cache is
// cleared by the parent on AuditLogAppended broadcasts so a fresh
// moderation event invalidates any displayed counts.
const MemberSummaryView: React.FC<{
  userId: string;
  nickname: string;
  cache: React.MutableRefObject<Map<string, MemberSummary>>;
  onActed: () => void;
}> = ({ userId, nickname, cache, onActed }) => {
  const [data, setData] = useState<MemberSummary | undefined>(() =>
    cache.current.get(userId),
  );
  const [error, setError] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (cache.current.has(userId)) {
      setData(cache.current.get(userId));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await withClientRetry(() =>
          moderationServiceClient.getMemberSummary({ userId }),
        );
        if (cancelled) return;
        cache.current.set(userId, r);
        setData(r);
        setError(undefined);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, cache]);

  // Read content varies by state (loading / error / empty / full); the
  // "Manage member" action panel renders unconditionally below it so an
  // admin can act regardless of whether the summary loaded — including
  // for members with no prior moderation history.
  const summary = (() => {
    if (error) return <div className={styles.summaryError}>{error}</div>;
    if (!data) return <div className={styles.summaryLoading}>Loading…</div>;
    if (data.totalEvents === 0) {
      return (
        <div className={styles.summaryEmpty}>
          No prior moderation events for this member.
        </div>
      );
    }
    const first = Number(data.firstEventAt);
    const last = Number(data.lastEventAt);
    return (
      <div className={styles.summaryContent}>
        <div className={styles.summaryHeader}>
          <strong>
            {data.nickname || `user ${userId.slice(0, 8)}…`}
          </strong>
          <span className={styles.summaryTotal}>
            {data.totalEvents}{" "}
            {data.totalEvents === 1 ? "event" : "events"} in moderation log
          </span>
        </div>
        <div className={styles.summaryChips}>
          {data.byRule.map((r) => (
            <Pill key={r.rule}>
              {ruleLabel(r.rule)}: {r.count}
            </Pill>
          ))}
        </div>
        <div className={styles.summaryDates}>
          First: {formatRelative(first)} · Last: {formatRelative(last)}
        </div>
      </div>
    );
  })();
  return (
    <>
      {summary}
      <div className={styles.manageMember}>
        <div className={styles.manageMemberHeading}>Manage member</div>
        <MemberActions
          userId={userId}
          username={nickname}
          onActed={onActed}
        />
      </div>
    </>
  );
};

function actionLabel(a: ActionType): string {
  switch (a) {
    case ActionType.DELETE_MESSAGE:
      return "delete message";
    case ActionType.KICK:
      return "kick";
    case ActionType.BAN:
      return "ban";
    case ActionType.UNBAN_MEMBER:
      return "unban";
    case ActionType.CLEAR_AUDIT_LOG:
      return "clear audit log";
    case ActionType.UNSPECIFIED:
      // UNSPECIFIED is reserved for rule-pipeline failure rows — see
      // messageHandler.logRuleFailure. Surface as "rule error" so an
      // admin scanning the table can spot internal failures distinct
      // from real moderation actions.
      return "rule error";
    default:
      return "—";
  }
}

function actionVariant(a: ActionType): BadgeVariant {
  switch (a) {
    case ActionType.DELETE_MESSAGE:
    case ActionType.KICK:
      return "warning";
    case ActionType.BAN:
    case ActionType.CLEAR_AUDIT_LOG:
      return "error";
    case ActionType.UNBAN_MEMBER:
      // Inverse of BAN — a recovering action; render as success so the
      // table tells a clear "ban red, unban green" story across rows.
      return "success";
    case ActionType.UNSPECIFIED:
      // Internal rule-pipeline failure rows render as error so they
      // don't blend in with neutral defaults — admins should notice.
      return "error";
    default:
      return "default";
  }
}

function ruleLabel(r: RuleType): string {
  switch (r) {
    case RuleType.CONTENT_FILTER:
      return "Content filter";
    case RuleType.SPAM_DETECTION:
      return "Spam detection";
    case RuleType.RATE_LIMIT:
      return "Rate limit";
    case RuleType.USERNAME_FILTER:
      return "Username filter";
    case RuleType.URL_FILTER:
      return "URL filter";
    case RuleType.NEW_MEMBER_GATE:
      return "New member gate";
    case RuleType.MENTION_SPAM:
      return "Mention spam";
    case RuleType.MANUAL:
      return "Manual";
    default:
      return "—";
  }
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + "…" : id;
}
