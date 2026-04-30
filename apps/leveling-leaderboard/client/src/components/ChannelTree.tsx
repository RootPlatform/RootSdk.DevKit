import React, { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import styles from "./ChannelTree.module.css";

// ============================================================================
// ChannelTree — expandable groups + channel toggles for Settings → Channels.
// DESIGN.md Responsive: groups collapsed by default at < 640px, expanded above.
// ============================================================================

export interface ChannelTreeChannel {
  channelId: string;
  name: string;
  excluded: boolean; // true = XP NOT earned
}

export interface ChannelTreeGroup {
  channelGroupId: string;
  name: string;
  channels: ChannelTreeChannel[];
}

interface Props {
  groups: ChannelTreeGroup[];
  onToggle: (channelId: string, excluded: boolean) => void;
}

export const ChannelTree: React.FC<Props> = ({ groups, onToggle }) => {
  // Initial expanded state depends on width. Default expanded >= 640px.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches) {
      return new Set(groups.map((g) => g.channelGroupId));
    }
    return new Set();
  });

  // Apply default expansion ONCE, when real groups first arrive (mount starts
  // with an empty groups list while the parent fetches). Subsequent groups
  // updates must not re-expand — that would undo the user's manual collapses
  // any time the parent refetches or a ChannelEvent invalidates the tree.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (groups.length === 0) return;
    initializedRef.current = true;
    const wide = window.matchMedia("(min-width: 640px)").matches;
    if (wide) {
      setExpanded(new Set(groups.map((g) => g.channelGroupId)));
    }
  }, [groups]);

  const toggleGroup = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.tree}>
      {groups.map((group) => {
        const isOpen = expanded.has(group.channelGroupId);
        const enabledCount = group.channels.filter((c) => !c.excluded).length;
        return (
          <div key={group.channelGroupId} className={styles.group}>
            <button
              type="button"
              className={styles.groupHeader}
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.channelGroupId)}
            >
              <span className={[styles.chevron, isOpen ? styles.chevronOpen : ""].join(" ")}>
                <ChevronRight size={14} />
              </span>
              <span className={styles.groupName}>{group.name}</span>
              <span className={styles.badge}>
                {enabledCount}/{group.channels.length}
              </span>
            </button>
            {isOpen && (
              <div className={styles.channels}>
                {group.channels.map((channel) => (
                  <label key={channel.channelId} className={styles.channelRow}>
                    <span className={styles.channelName}>#{channel.name}</span>
                    <input
                      type="checkbox"
                      className={styles.toggle}
                      checked={!channel.excluded}
                      onChange={(e) => onToggle(channel.channelId, !e.target.checked)}
                    />
                  </label>
                ))}
                {group.channels.length === 0 && (
                  <div className={styles.empty}>No channels in this group.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {groups.length === 0 && (
        <div className={styles.empty}>No channel groups.</div>
      )}
    </div>
  );
};
