import React, { useState } from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import { GetSettingsResponse } from "@moderation/gen-shared";
import { FormRow, Toggle, styles } from "../Settings";
import { useDebouncedMutation } from "../../lib/useDebouncedMutation";
import { AutoSaveStatus } from "../../components/AutoSaveStatus";
import { Panel } from "../../components/Panel";

// MonitoredChannelsTab — empty channel-id list means "monitor all channels"
// per design.md. The "Monitor all" toggle is a UX shortcut: ON clears the
// selection (server interprets empty as all); OFF reveals the per-channel
// checkboxes and starts with the current explicit selection.

interface Props {
  data: GetSettingsResponse;
  onSaved: () => void;
}

export const MonitoredChannelsTab: React.FC<Props> = ({ data, onSaved }) => {
  const initial = new Set(data.monitored?.channelIds ?? []);
  const initialAll = initial.size === 0;
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [allMode, setAllMode] = useState(initialAll);

  const { mutate, retry, error, clearError } = useDebouncedMutation<string[]>({
    mutationFn: async (ids) => {
      await moderationServiceClient.updateMonitoredChannels({
        channelIds: ids,
      });
      onSaved();
    },
  });

  const commit = (next: Set<string>, allOn: boolean) => {
    setSelected(next);
    setAllMode(allOn);
    mutate(allOn ? [] : Array.from(next));
  };

  const toggleChannel = (channelId: string) => {
    const next = new Set(selected);
    if (next.has(channelId)) next.delete(channelId);
    else next.add(channelId);
    commit(next, false);
  };

  const toggleAllMode = (on: boolean) => {
    if (on) commit(new Set(), true);
    else commit(selected, false);
  };

  return (
    <Panel
      title="Monitored channels"
      description="Choose which channels the moderation pipeline acts on."
    >
      <FormRow
        label="Monitor all channels"
        description="When on, every channel this app has access to is monitored. Turn off to pick specific channels below."
      >
        <Toggle checked={allMode} onChange={toggleAllMode} />
      </FormRow>
      {!allMode && (
        <div>
          {data.channelTree.length === 0 ? (
            <div className={styles.help}>No channels visible to the app.</div>
          ) : (
            data.channelTree.map((g) => (
              <div key={g.channelGroupId} className={styles.channelGroup}>
                <div className={styles.channelGroupTitle}>{g.name}</div>
                {g.channels.map((c) => (
                  <label key={c.channelId} className={styles.channelItem}>
                    <input
                      type="checkbox"
                      checked={selected.has(c.channelId)}
                      onChange={() => toggleChannel(c.channelId)}
                    />
                    <span>#{c.name}</span>
                  </label>
                ))}
              </div>
            ))
          )}
        </div>
      )}
      <AutoSaveStatus
        error={error}
        onRetry={retry}
        onDismissError={clearError}
      />
    </Panel>
  );
};
