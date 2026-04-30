import React, { useCallback, useEffect, useState } from "react";
import {
  moderationServiceClient,
  ModerationServiceClientEvent,
} from "@moderation/gen-client";
import {
  AnalyticsRange,
  GetAnalyticsResponse,
} from "@moderation/gen-shared";
import {
  Activity,
  BarChart3,
  Gauge,
  MessageSquareOff,
  Shield,
  UserX,
} from "lucide-react";
import { withClientRetry } from "../lib/retry";
import { formatDayLabel, formatHourLabel } from "../lib/format";
import styles from "./Analytics.module.css";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import { SubTabs } from "../components/SubTabs";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { Pill } from "../components/Pill";

// Analytics — totals + stacked bar chart by rule + horizontal rule
// breakdown + top channels. Read-only for everyone (per design.md).

const RANGE_ITEMS = [
  { key: AnalyticsRange.LAST_24H, label: "Last 24 hours" },
  { key: AnalyticsRange.LAST_7D, label: "Last 7 days" },
  { key: AnalyticsRange.LAST_30D, label: "Last 30 days" },
];

export const Analytics: React.FC = () => {
  const [range, setRange] = useState<AnalyticsRange>(AnalyticsRange.LAST_24H);
  const [data, setData] = useState<GetAnalyticsResponse | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await withClientRetry(() =>
        moderationServiceClient.getAnalytics({ range }),
      );
      setData(r);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live refresh on AuditLogAppended.
  useEffect(() => {
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

  const total = data.total;
  const hasBucketData = data.buckets.some(
    (b) => b.contentFilter + b.spam + b.rateLimit + b.manual > 0,
  );
  const hasRuleData =
    data.contentFilterTotal +
      data.spamTotal +
      data.rateLimitTotal +
      data.manualTotal >
    0;

  return (
    <div className={styles.analytics}>
      <header className={styles.heading}>
        <h2 className={styles.title}>Analytics</h2>
        <p className={styles.subtitle}>Moderation trends and statistics</p>
      </header>

      <SubTabs
        items={RANGE_ITEMS.map((it) => ({ key: it.key, label: it.label }))}
        active={range}
        onChange={setRange}
        ariaLabel="Time range"
      />

      {/* One card per rule type so the percentage breakdowns sum to 100%
          when actions exist. Without the Rate limit card, rate-limit
          deletions would be invisible in the card strip and the other
          three percentages wouldn't reconcile against Total. */}
      <div className={styles.cards}>
        <StatCard
          label="Total"
          value={total}
          accent="brand"
          icon={<Shield size={20} />}
        />
        <StatCard
          label="Content filter"
          value={data.contentFilterTotal}
          subtle={pct(data.contentFilterTotal, total)}
          accent="warning"
          icon={<MessageSquareOff size={20} />}
        />
        <StatCard
          label="Spam"
          value={data.spamTotal}
          subtle={pct(data.spamTotal, total)}
          accent="success"
          icon={<Activity size={20} />}
        />
        <StatCard
          label="Rate limit"
          value={data.rateLimitTotal}
          subtle={pct(data.rateLimitTotal, total)}
          accent="neutral"
          icon={<Gauge size={20} />}
        />
        <StatCard
          label="Manual"
          value={data.manualTotal}
          subtle={pct(data.manualTotal, total)}
          accent="info"
          icon={<UserX size={20} />}
        />
      </div>

      <div className={styles.chartGrid}>
        <Panel
          title="Actions over time"
          description="Daily breakdown of moderation actions"
        >
          {hasBucketData ? (
            <>
              <StackedBars data={data} range={range} />
              <div className={styles.legend}>
                <LegendItem
                  className={styles.contentSeg}
                  label="Content filter"
                />
                <LegendItem className={styles.spamSeg} label="Spam" />
                <LegendItem className={styles.rateSeg} label="Rate limit" />
                <LegendItem className={styles.manualSeg} label="Manual" />
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Activity size={48} />}
              title="No trend data yet"
              body="Once moderation actions are recorded, the time series shows up here."
            />
          )}
        </Panel>

        <Panel title="Rule breakdown" description="Actions by rule type">
          {hasRuleData ? (
            <RuleBreakdown data={data} />
          ) : (
            <EmptyState
              icon={<BarChart3 size={48} />}
              title="No rule data yet"
              body="A breakdown by rule will appear after the first action."
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Top channels"
        description="Channels with the most moderation actions"
      >
        {data.topChannels.length === 0 ? (
          <EmptyState
            icon={<Shield size={48} />}
            title="No channel data yet"
            body="When messages are filtered or removed, the busiest channels list here."
          />
        ) : (
          <div className={styles.channelsList}>
            {data.topChannels.map((c) => {
              const max = data.topChannels[0]?.count || 1;
              return (
                <div key={c.channelId} className={styles.channelRow}>
                  <div className={styles.channelRowName}>
                    <Pill prefix="#">{c.channelName || "unknown"}</Pill>
                    <div className={styles.channelRowBar}>
                      <div
                        className={styles.channelRowFill}
                        style={{ width: `${(c.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className={styles.channelRowCount}>{c.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

const LegendItem: React.FC<{ className: string; label: string }> = ({
  className,
  label,
}) => (
  <span className={styles.legendItem}>
    <span className={`${styles.swatch} ${className}`} />
    {label}
  </span>
);

const StackedBars: React.FC<{
  data: GetAnalyticsResponse;
  range: AnalyticsRange;
}> = ({ data, range }) => {
  const max = Math.max(
    1,
    ...data.buckets.map(
      (b) => b.contentFilter + b.spam + b.rateLimit + b.manual,
    ),
  );
  const showLabels = data.buckets.length <= 14;
  return (
    <>
      <div className={styles.bars}>
        {data.buckets.map((b, i) => {
          const total = b.contentFilter + b.spam + b.rateLimit + b.manual;
          if (total === 0) return <div key={i} className={styles.barCol} />;
          return (
            <div key={i} className={styles.barCol}>
              <div
                className={styles.contentSeg}
                style={{ height: `${(b.contentFilter / max) * 100}%` }}
              />
              <div
                className={styles.spamSeg}
                style={{ height: `${(b.spam / max) * 100}%` }}
              />
              <div
                className={styles.rateSeg}
                style={{ height: `${(b.rateLimit / max) * 100}%` }}
              />
              <div
                className={styles.manualSeg}
                style={{ height: `${(b.manual / max) * 100}%` }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className={styles.bars} style={{ height: "auto" }}>
          {data.buckets.map((b, i) => (
            <div key={i} className={styles.barLabel}>
              {formatBucket(Number(b.timestamp), range)}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

function formatBucket(ms: number, range: AnalyticsRange): string {
  if (range === AnalyticsRange.LAST_24H) return formatHourLabel(ms);
  return formatDayLabel(ms);
}

const RuleBreakdown: React.FC<{ data: GetAnalyticsResponse }> = ({ data }) => {
  const max = Math.max(
    1,
    data.contentFilterTotal,
    data.spamTotal,
    data.rateLimitTotal,
    data.manualTotal,
  );
  return (
    <div className={styles.ruleBreakdown}>
      <RuleRow
        label="Content filter"
        count={data.contentFilterTotal}
        max={max}
        fillClass={styles.contentSeg}
      />
      <RuleRow
        label="Spam"
        count={data.spamTotal}
        max={max}
        fillClass={styles.spamSeg}
      />
      <RuleRow
        label="Rate limit"
        count={data.rateLimitTotal}
        max={max}
        fillClass={styles.rateSeg}
      />
      <RuleRow
        label="Manual"
        count={data.manualTotal}
        max={max}
        fillClass={styles.manualSeg}
      />
    </div>
  );
};

const RuleRow: React.FC<{
  label: string;
  count: number;
  max: number;
  fillClass: string;
}> = ({ label, count, max, fillClass }) => (
  <div className={styles.ruleRow}>
    <span>{label}</span>
    <div className={styles.ruleBar}>
      <div
        className={`${styles.ruleBarFill} ${fillClass}`}
        style={{ width: `${(count / max) * 100}%` }}
      />
    </div>
    <span style={{ textAlign: "right" }}>{count}</span>
  </div>
);

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
