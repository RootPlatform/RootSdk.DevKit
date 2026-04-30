import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  moderationServiceClient,
  ModerationServiceClientEvent,
} from "@moderation/gen-client";
import {
  AuditEntry,
  ActionType,
  RuleType,
} from "@moderation/gen-shared";
import { Clock, Search } from "lucide-react";
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

const ACTION_OPTIONS = [
  { value: ActionType.UNSPECIFIED, label: "All actions" },
  { value: ActionType.DELETE_MESSAGE, label: "Delete message" },
  { value: ActionType.KICK, label: "Kick" },
  { value: ActionType.BAN, label: "Ban" },
];
const RULE_OPTIONS = [
  { value: RuleType.UNSPECIFIED, label: "All rules" },
  { value: RuleType.CONTENT_FILTER, label: "Content filter" },
  { value: RuleType.SPAM_DETECTION, label: "Spam detection" },
  { value: RuleType.RATE_LIMIT, label: "Rate limit" },
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
            usernameFilter: filters.username,
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
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Rule</th>
                  <th>Matched</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <Row key={e.id.toString()} entry={e} onActed={refresh} />
                ))}
              </tbody>
            </table>
          </div>
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

const Row: React.FC<{ entry: AuditEntry; onActed: () => void }> = ({
  entry,
  onActed,
}) => {
  const ts = Number(entry.timestamp);
  return (
    <tr>
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
        <strong>{entry.targetUsername || shortId(entry.targetUserId)}</strong>
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
      <td>
        {entry.targetUserId && (
          <MemberActions
            userId={entry.targetUserId}
            username={entry.targetUsername}
            onActed={onActed}
          />
        )}
      </td>
    </tr>
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
    case RuleType.MANUAL:
      return "Manual";
    default:
      return "—";
  }
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + "…" : id;
}
