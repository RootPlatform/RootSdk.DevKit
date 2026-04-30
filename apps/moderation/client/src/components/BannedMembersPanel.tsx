import React, { useCallback, useEffect, useState } from "react";
import {
  moderationServiceClient,
  ModerationServiceClientEvent,
} from "@moderation/gen-client";
import type { BannedMember } from "@moderation/gen-shared";
import { Lock } from "lucide-react";
import { withClientRetry } from "../lib/retry";
import { Panel } from "./Panel";
import { Badge } from "./Badge";
import { InlineConfirm } from "./InlineConfirm";
import { EmptyState } from "./EmptyState";
import { Loader } from "./Loader";
import styles from "./BannedMembersPanel.module.css";

// BannedMembersPanel — admin-only, state-pivoted view of who's currently
// banned (vs. the audit log's event history). The pattern: bans are
// state, not events. The audit log records "user X was banned at T1,
// then unbanned at T2, then banned again at T3" as three event rows;
// this panel shows "user X is banned right now, expires T+5d." Different
// mental model, different surface.
//
// Refreshes on AuditLogAppended broadcasts — every kick/ban/unban writes
// an audit row, so listening to AuditLogAppended is a reliable
// invalidation signal without needing a dedicated BansChanged broadcast.
// (Some events that affect ban state — SDK auto-expiry of temp bans —
// don't fire AuditLogAppended; those just resolve themselves on the
// next manual refresh or when another moderation event triggers a re-
// fetch. Acceptable lag: temp-ban expiry is naturally a "check back
// later" UX.)
//
// Why on Dashboard, not its own nav item: admins land on Dashboard
// first; current-bans is at-a-glance state that belongs alongside
// "monitored channels" and "recent activity." A sample with five top-
// level views starts to drown its own structure.

export const BannedMembersPanel: React.FC = () => {
  const [members, setMembers] = useState<BannedMember[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pendingUnban, setPendingUnban] = useState<Set<string>>(new Set());
  const [unbanError, setUnbanError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await withClientRetry(() =>
        moderationServiceClient.listBannedMembers({}),
      );
      setMembers(r.members);
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

  const handleUnban = useCallback(async (userId: string, reason: string) => {
    setUnbanError(undefined);
    try {
      await withClientRetry(() =>
        moderationServiceClient.unbanMember({ userId, reason }),
      );
      // Optimistic local removal — the AuditLogAppended broadcast will
      // refetch and reconcile. If reconcile shows the user is still
      // banned (e.g., concurrent re-ban), the row reappears.
      setMembers((prev) => prev?.filter((m) => m.userId !== userId));
      setPendingUnban((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } catch (err) {
      setUnbanError(err instanceof Error ? err.message : String(err));
      setPendingUnban((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, []);

  if (loading && !members) {
    return (
      <Panel title="Banned members" description="Currently active bans">
        <Loader />
      </Panel>
    );
  }
  if (error && !members) {
    return (
      <Panel title="Banned members" description="Currently active bans">
        <div className={styles.error}>{error}</div>
      </Panel>
    );
  }
  const list = members ?? [];

  return (
    <Panel
      title="Banned members"
      description="Currently active bans"
      action={
        <Badge variant="default">
          {list.length} {list.length === 1 ? "ban" : "bans"}
        </Badge>
      }
    >
      {list.length === 0 ? (
        <EmptyState
          icon={<Lock size={48} />}
          title="No active bans"
          body="When a member is banned (manually or by the username filter), they'll appear here until the ban is lifted or expires."
        />
      ) : (
        <div className={styles.list}>
          {list.map((m) => {
            const idKey = m.userId;
            const expiresAt = Number(m.expiresAt);
            const isPending = pendingUnban.has(idKey);
            return isPending ? (
              <div key={idKey} className={styles.row}>
                <InlineConfirm
                  prompt={`Lift ban on ${m.nickname}?`}
                  commitLabel="Unban"
                  collectReason
                  reasonPlaceholder="Reason for lifting the ban (optional)"
                  onCancel={() =>
                    setPendingUnban((prev) => {
                      const next = new Set(prev);
                      next.delete(idKey);
                      return next;
                    })
                  }
                  onCommit={(reason) => handleUnban(m.userId, reason)}
                />
              </div>
            ) : (
              <div key={idKey} className={styles.row}>
                <div className={styles.rowText}>
                  <strong className={styles.rowName}>{m.nickname}</strong>
                  {expiresAt > 0 ? (
                    <span className={styles.rowMeta}>
                      Expires {formatExpires(expiresAt)}
                    </span>
                  ) : (
                    <span className={styles.rowMeta}>Permanent</span>
                  )}
                  {m.reason && (
                    <span className={styles.rowReason}>“{m.reason}”</span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.unbanButton}
                  onClick={() =>
                    setPendingUnban((prev) => {
                      const next = new Set(prev);
                      next.add(idKey);
                      return next;
                    })
                  }
                >
                  Unban
                </button>
              </div>
            );
          })}
        </div>
      )}
      {unbanError && (
        <div className={styles.error} role="alert">
          {unbanError}
        </div>
      )}
    </Panel>
  );
};

function formatExpires(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return "any moment now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours} hr`;
  const days = Math.floor(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
