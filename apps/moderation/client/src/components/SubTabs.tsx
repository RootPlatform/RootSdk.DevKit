import React from "react";
import styles from "./SubTabs.module.css";

export interface SubTabItem<K extends string | number> {
  key: K;
  label: React.ReactNode;
}

interface Props<K extends string | number> {
  items: SubTabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  ariaLabel?: string;
  className?: string;
}

// SubTabs — generic underline-style tab strip. Used by Settings sub-tabs
// and Analytics range picker. The component is purely presentational —
// view state lives in the parent. Generic over key type so callers get
// exhaustive switch checking.
export function SubTabs<K extends string | number>({
  items,
  active,
  onChange,
  ariaLabel,
  className = "",
}: Props<K>): React.ReactElement {
  return (
    <div
      className={`${styles.tabs} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
            onClick={() => onChange(item.key)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
