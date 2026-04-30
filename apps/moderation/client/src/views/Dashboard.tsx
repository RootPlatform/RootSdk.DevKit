import React, { useCallback, useEffect, useState } from "react";
import {
  moderationServiceClient,
  ModerationServiceClientEvent,
} from "@moderation/gen-client";
import {
  ActionType,
  RuleType,
  AuditEntry,
  GetDashboardResponse,
} from "@moderation/gen-shared";
import {
  Ban,
  Clock,
  Eraser,
  Info,
  Lock,
  LockOpen,
  MessageSquareOff,
  Shield,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { withClientRetry } from "../lib/retry";
import { formatRelative, formatAbsolute } from "../lib/format";
import styles from "./Dashboard.module.css";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import { Badge, BadgeVariant } from "../components/Badge";
import { Pill } from "../components/Pill";
import { IconBox, IconBoxAccent } from "../components/IconBox";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { MonitoredChannelsPanel } from "../components/MonitoredChannelsPanel";
import { BannedMembersPanel } from "../components/BannedMembersPanel";
import { MemberActions } from "../components/MemberActions";
import { useAdmin } from "../contexts/AdminContext";

// Dashboard — 24h overview. Subscribes to AuditLogAppended so counters
// and recent events stay live without manual refresh.

export const Dashboard: React.FC = () => {
  const { amIAdmin } = useAdmin();
  const [data, setData] = useState<GetDashboardResponse | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const r = await withClientRetry(() =>
        moderationServiceClient.getDashboard({}),
      );
      setData(r);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onAppended = () => {
      void refresh();
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
  }, [refresh]);

  if (loading && !data) return <Loader />;
  if (error && !data) return <QueryError onRetry={refresh} message={error} />;
  if (!data) return null;

  const summary = data.summary;
  return (
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <h2 className={styles.title}>Dashboard</h2>
        <p className={styles.subtitle}>
          Overview of moderation activity in the last 24 hours
        </p>
      </header>

      <div className={styles.cards}>
        <StatCard
          label="Total actions"
          value={summary?.totalActions24H ?? 0}
          subtle="Last 24 hours"
          accent="brand"
          icon={<Shield size={20} />}
        />
        <StatCard
          label="Content filtered"
          value={summary?.contentFiltered24H ?? 0}
          subtle="Auto-removed"
          accent="warning"
          icon={<MessageSquareOff size={20} />}
        />
        <StatCard
          label="Manual actions"
          value={summary?.manualActions24H ?? 0}
          subtle="By admins"
          accent="error"
          icon={<UserX size={20} />}
        />
      </div>

      <MonitoredChannelsPanel
        channelNames={data.monitoredChannelNames}
        monitoringAll={data.monitoringAll}
      />

      {/* Admin-only: current-bans state view alongside the activity event
          stream below. State pivot vs event log — see DESIGN.md →
          "Banned members". */}
      {amIAdmin && <BannedMembersPanel />}

      <Panel title="Recent activity" description="Latest moderation events">
        {data.recent.length === 0 ? (
          <EmptyState
            icon={<Shield size={48} />}
            title="No moderation actions yet"
            body="When a rule fires or an admin takes a manual action, it'll show up here."
          />
        ) : (
          <div className={styles.recentList}>
            {data.recent.map((entry) => (
              <RecentActivityRow
                key={entry.id.toString()}
                entry={entry}
                amIAdmin={amIAdmin}
                onActed={refresh}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

const RecentActivityRow: React.FC<{
  entry: AuditEntry;
  amIAdmin: boolean;
  onActed: () => void;
}> = ({ entry, amIAdmin, onActed }) => {
  const ts = Number(entry.timestamp);
  const accent: IconBoxAccent = entry.manual ? "info" : ruleAccent(entry.rule);
  const ActionIcon = actionIconFor(entry.action);
  return (
    <div className={styles.row}>
      <IconBox accent={accent} size={32}>
        <ActionIcon size={16} />
      </IconBox>
      <div className={styles.rowDetails}>
        <div className={styles.rowChips}>
          <Badge variant={actionVariant(entry.action)}>
            {actionLabel(entry.action)}
          </Badge>
          <Badge variant={entry.manual ? "info" : "default"}>
            {entry.manual ? "manual" : "auto"}
          </Badge>
        </div>
        {entry.targetUserId ? (
          <>
            <strong>{entry.targetNickname || shortId(entry.targetUserId)}</strong>
            {entry.channelName && (
              <>
                {" in "}
                <Pill prefix="#">{entry.channelName}</Pill>
              </>
            )}
          </>
        ) : entry.actorUserId ? (
          // System-actor events (e.g. CLEAR_AUDIT_LOG) have no target;
          // surface the admin actor — frozen-at-write nickname with a
          // short-id fallback so the row is self-explaining.
          <span>By {entry.actorNickname || shortId(entry.actorUserId)}</span>
        ) : (
          <span>Target unknown</span>
        )}
        {entry.matchedTerm && (
          <>
            {" · matched "}
            <Pill>{entry.matchedTerm}</Pill>
          </>
        )}
        {entry.messageExcerpt && (
          <p className={styles.rowExcerpt}>
            “{entry.messageExcerpt.slice(0, 160)}
            {entry.messageExcerpt.length > 160 ? "…" : ""}”
          </p>
        )}
      </div>
      {/* Right column: timestamp + (admin-only) member action affordances.
          Lifted out of rowDetails so destructive controls don't visually
          mingle with the read content (chips, identity, message excerpt).
          Auto-grow on the grid column means the confirm panel — which
          renders inline when an admin clicks Kick or Ban — gets the
          horizontal space it needs while the row is in confirm mode. */}
      <div className={styles.rowMeta}>
        <span className={styles.rowTime} title={formatAbsolute(ts)}>
          <Clock size={12} />
          {formatRelative(ts)}
        </span>
        {amIAdmin && entry.targetUserId && (
          <MemberActions
            userId={entry.targetUserId}
            username={entry.targetNickname}
            onActed={onActed}
          />
        )}
      </div>
    </div>
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
    default:
      return "—";
  }
}

function actionVariant(a: ActionType): BadgeVariant {
  switch (a) {
    case ActionType.DELETE_MESSAGE:
      return "warning";
    case ActionType.KICK:
      return "warning";
    case ActionType.BAN:
      return "error";
    case ActionType.UNBAN_MEMBER:
      return "success";
    case ActionType.CLEAR_AUDIT_LOG:
      return "error";
    default:
      return "default";
  }
}

// IconBox accent for an automated action's icon. Manual actions use a
// neutral info accent (handled at the call site) so the visual weight
// distinguishes them from rule-driven automation.
function ruleAccent(r: RuleType): IconBoxAccent {
  switch (r) {
    case RuleType.CONTENT_FILTER:
      return "warning";
    case RuleType.SPAM_DETECTION:
      return "warning";
    case RuleType.RATE_LIMIT:
      return "warning";
    case RuleType.USERNAME_FILTER:
      return "error";
    case RuleType.URL_FILTER:
      return "warning";
    case RuleType.NEW_MEMBER_GATE:
      return "warning";
    case RuleType.MENTION_SPAM:
      return "warning";
    case RuleType.MANUAL:
      return "info";
    default:
      return "neutral";
  }
}

function actionIconFor(a: ActionType): LucideIcon {
  switch (a) {
    case ActionType.DELETE_MESSAGE:
      return Ban;
    case ActionType.KICK:
      return UserX;
    case ActionType.BAN:
      return Lock;
    case ActionType.UNBAN_MEMBER:
      return LockOpen;
    case ActionType.CLEAR_AUDIT_LOG:
      return Eraser;
    default:
      return Info;
  }
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + "…" : id;
}
