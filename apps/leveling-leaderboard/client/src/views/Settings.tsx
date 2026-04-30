import React, { useCallback, useEffect, useState } from "react";
import {
  leaderboardServiceClient,
  LeaderboardServiceClientEvent,
} from "@levelingleaderboard/gen-client";
import type {
  ChannelGroup as ProtoChannelGroup,
  GetSettingsResponse,
  SettingsUpdatedEvent,
} from "@levelingleaderboard/gen-shared";
import styles from "./Settings.module.css";
import { AdminOnly } from "../components/AdminOnly";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { Info } from "lucide-react";
import { Button } from "../components/Button";
import { SettingsTabs, type SettingsTabKey } from "../components/SettingsTabs";
import { ScoringTab } from "./settings/ScoringTab";
import { ChannelsTab } from "./settings/ChannelsTab";
import { MembersTab } from "./settings/MembersTab";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// Settings view — admin-only. Three tabs per DESIGN.md Layout → Settings:
//   * Scoring  — XP knobs + reset actions
//   * Channels — per-channel XP exclusion
//   * Members  — XP-eligible roles and members (MemberGroup-backed)
//
// Admins are managed via Root's native Global Settings UI
// (manifest setting `general.admins`) — NOT in this app's Settings.
//
// Each tab auto-saves. No Save buttons anywhere except inside tab-local
// destructive actions (reset member, reset all) which keep explicit
// confirmation.
//
// When another admin saves, the server broadcasts SettingsUpdated. To avoid
// clobbering unsaved local edits in this view, we show a non-intrusive
// Refresh banner instead of auto-applying the change.
// ============================================================================

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("scoring");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<GetSettingsResponse | undefined>(undefined);
  const [tree, setTree] = useState<ProtoChannelGroup[]>([]);
  const [treeError, setTreeError] = useState<Error | undefined>(undefined);
  const [staleNotice, setStaleNotice] = useState(false);

  // Settings fetch and channel-tree fetch are independent — if the tree
  // call fails, Scoring + Members can still render. The Channels tab
  // surfaces the tree error inline.
  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    setTreeError(undefined);
    setStaleNotice(false);
    try {
      const settings = await withClientRetry(() =>
        leaderboardServiceClient.getSettings({}),
      );
      setData(settings);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
      return;
    }
    try {
      const treeResp = await withClientRetry(() =>
        leaderboardServiceClient.getChannelTree({}),
      );
      setTree(treeResp.groups);
    } catch (err: unknown) {
      setTreeError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Refresh notice when another admin pushes a change. We don't auto-apply —
  // a rebase over in-flight local edits would drop the user's typing.
  useEffect(() => {
    const onSettingsUpdated = (_event: SettingsUpdatedEvent) => {
      setStaleNotice(true);
    };
    leaderboardServiceClient.on(
      LeaderboardServiceClientEvent.SettingsUpdated,
      onSettingsUpdated,
    );
    return () => {
      leaderboardServiceClient.off(
        LeaderboardServiceClientEvent.SettingsUpdated,
        onSettingsUpdated,
      );
    };
  }, []);

  return (
    <AdminOnly>
      <div className={styles.settings}>
        {/* topArea is pinned — tabs and the stale-data banner stay visible
            while the tab body scrolls. The scroll region below has its own
            scrollbar so the page-level scrollbar never visually overlaps
            the tab row. */}
        <div className={styles.topArea}>
          <div className={styles.topInner}>
            {staleNotice && (
              <div className={styles.staleNotice} role="status">
                <Info size={16} />
                <span className={styles.staleNoticeText}>
                  Settings were changed by another admin.
                </span>
                <Button variant="outline" onClick={reload}>
                  Refresh
                </Button>
              </div>
            )}
            {data && !loading && !error && (
              <SettingsTabs active={activeTab} onChange={setActiveTab} />
            )}
          </div>
        </div>

        <div className={styles.scrollArea}>
          <div className={styles.scrollInner}>
            {loading && <Loader />}
            {error && <QueryError onRetry={reload} />}

            {data && !loading && !error && data.settings && data.limits && (
              <>
                {activeTab === "scoring" && (
                  <ScoringTab
                    initial={data.settings}
                    limits={data.limits}
                    onSaved={(s) => setData({ ...data, settings: s })}
                  />
                )}

                {activeTab === "channels" && (
                  <ChannelsTab
                    groups={tree}
                    excludedChannelIds={data.excludedChannelIds}
                    loadError={treeError}
                    onReload={reload}
                    onSaved={(excluded) => {
                      setData({ ...data, excludedChannelIds: excluded });
                      setTree((prev) =>
                        prev.map((g) => ({
                          ...g,
                          channels: g.channels.map((c) => ({
                            ...c,
                            excluded: excluded.includes(c.channelId),
                          })),
                        })),
                      );
                    }}
                  />
                )}

                {activeTab === "members" && data.xpEligibleMembers && (
                  <MembersTab
                    initial={data.xpEligibleMembers}
                    onSaved={(members) =>
                      setData({ ...data, xpEligibleMembers: members })
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminOnly>
  );
};
