import React from "react";
import styles from "./MonitoredChannelsPanel.module.css";
import { Panel } from "./Panel";
import { Badge } from "./Badge";

interface Props {
  // Channel display names (already resolved server-side).
  channelNames: string[];
  // True when the underlying monitored set is empty, i.e. "monitor all".
  monitoringAll: boolean;
}

// MonitoredChannelsPanel — labelled panel showing the channels currently
// in the moderation watch set. Two display modes:
//
//   - monitoringAll === true: a single italicized hint row. The empty
//     channel-id list is meaningful (per design.md "Monitored channels":
//     empty = all channels), and showing it as a hint row instead of an
//     empty grid avoids implying the panel forgot to load.
//
//   - otherwise: a responsive grid of channel pills.
//
// The header carries a count badge so the cap is legible at a glance
// without reading the body.
export const MonitoredChannelsPanel: React.FC<Props> = ({
  channelNames,
  monitoringAll,
}) => {
  const count = monitoringAll ? "All" : `${channelNames.length}`;
  const countLabel =
    monitoringAll || channelNames.length !== 1 ? "channels" : "channel";
  return (
    <Panel
      title="Monitored channels"
      action={
        <Badge variant="default">
          {count} {countLabel}
        </Badge>
      }
    >
      {monitoringAll ? (
        <p className={styles.allHint}>
          Monitoring every channel this app has access to.
        </p>
      ) : channelNames.length === 0 ? (
        <p className={styles.allHint}>
          No channels selected. Add channels in Settings to monitor them.
        </p>
      ) : (
        <div className={styles.grid}>
          {channelNames.map((name) => (
            <span key={name} className={styles.pill}>
              <span className={styles.pillPrefix}>#</span>
              <span className={styles.pillName}>{name}</span>
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
};
