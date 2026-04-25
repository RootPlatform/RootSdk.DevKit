import React, { useEffect, useState } from "react";
import { leaderboardServiceClient } from "@levelingleaderboard/gen-client";
import type { ChannelGroup as ProtoChannelGroup } from "@levelingleaderboard/gen-shared";
import styles from "./ChannelsTab.module.css";
import { ChannelTree } from "../../components/ChannelTree";
import { QueryError } from "../../components/QueryError";
import { AutoSaveStatus } from "../../components/AutoSaveStatus";
import { useDebouncedMutation } from "../../lib/useDebouncedMutation";
import { withClientRetry } from "../../lib/retry";

// ============================================================================
// ChannelsTab — channel-exclusion toggles. Auto-save on every toggle.
//
// When the user toggles a channel, we update the local Set synchronously
// (responsive UI), then fire a debounced UpdateExcludedChannels RPC with the
// full target list. Multiple rapid toggles coalesce into one call.
//
// The payload is always the FULL target list, not a diff — the server
// replaces wholesale. This avoids drift vs. server state if a debounced
// batch is lost or a retry sends stale IDs.
// ============================================================================

interface Props {
  groups: ProtoChannelGroup[];
  excludedChannelIds: string[];
  loadError: Error | undefined;
  onReload: () => Promise<void>;
  onSaved: (excluded: string[]) => void;
}

export const ChannelsTab: React.FC<Props> = ({
  groups,
  excludedChannelIds,
  loadError,
  onReload,
  onSaved,
}) => {
  const [local, setLocal] = useState<Set<string>>(
    () => new Set(excludedChannelIds),
  );

  // If the parent refetches and excluded IDs change externally, re-sync.
  const externalKey = excludedChannelIds.slice().sort().join("\u0000");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setLocal(new Set(excludedChannelIds)), [externalKey]);

  const save = useDebouncedMutation<string[]>({
    mutationFn: async (ids) => {
      // Drop IDs for channels that have been deleted since our last
      // GetChannelTree (a live ChannelDeleted event removed them from
      // `groups`). Without this filter we'd persist ghost IDs into
      // excluded_channels where they'd live forever, never matching a
      // real message.
      const validIds = new Set<string>();
      for (const g of groups) for (const c of g.channels) validIds.add(c.channelId);
      const filtered = ids.filter((id) => validIds.has(id));
      await withClientRetry(() =>
        leaderboardServiceClient.updateExcludedChannels({
          excludedChannelIds: filtered,
        }),
      );
      onSaved(filtered);
    },
  });

  const toggle = (channelId: string, nowExcluded: boolean) => {
    const next = new Set(local);
    if (nowExcluded) next.add(channelId);
    else next.delete(channelId);
    setLocal(next);
    save.mutate([...next]);
  };

  if (loadError) {
    return (
      <div className={styles.tab}>
        <h2 className={styles.heading}>Channels</h2>
        <QueryError message="Failed to load channels." onRetry={onReload} />
      </div>
    );
  }

  const treeGroups = groups.map((g) => ({
    channelGroupId: g.channelGroupId,
    name: g.name,
    channels: g.channels.map((c) => ({
      channelId: c.channelId,
      name: c.name,
      excluded: local.has(c.channelId),
    })),
  }));

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Channels</h2>
          <p className={styles.help}>
            Toggle off any channel whose messages should not earn XP.
          </p>
        </div>
        <AutoSaveStatus
          error={save.error}
          onRetry={save.retry}
          onDismissError={save.clearError}
        />
      </div>
      <ChannelTree groups={treeGroups} onToggle={toggle} />
    </div>
  );
};

