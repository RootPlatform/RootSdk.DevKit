import React from "react";
import styles from "./SettingsTabs.module.css";

// ============================================================================
// SettingsTabs — horizontal sub-navigation inside the Settings view.
// Three tabs: Scoring, Channels, Members. No routing; active tab is a
// parent-held useState.
// ============================================================================

export type SettingsTabKey = "scoring" | "channels" | "members";

interface TabDef {
  key: SettingsTabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: "scoring", label: "Scoring" },
  { key: "channels", label: "Channels" },
  { key: "members", label: "Members" },
];

interface Props {
  active: SettingsTabKey;
  onChange: (tab: SettingsTabKey) => void;
}

export const SettingsTabs: React.FC<Props> = ({ active, onChange }) => {
  return (
    <nav className={styles.tabs} role="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={[styles.tab, isActive ? styles.active : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};
