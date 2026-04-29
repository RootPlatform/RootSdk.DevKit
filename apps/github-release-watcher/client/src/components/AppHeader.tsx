import React from "react";
import styles from "./AppHeader.module.css";
import { Icon } from "./Icon";
import { useFeed } from "../contexts/FeedContext";

// ============================================================================
// AppHeader — top bar for the single-view app. Two modes:
//
//   * "home"     — app title on the left, gear icon on the right (gear only
//                  renders when amIAdmin === true).
//   * "settings" — back chevron + "Settings" label on the left, nothing on
//                  the right. Caller handles the push-view pop via onBack.
//
// 48px tall, no border — the content's own card surfaces provide the visual
// separation. Keeping it borderless avoids a double-line against the feed
// list below. The header sits above the scrolling content region (see
// App.module.css), so it stays visible without needing position:sticky.
// ============================================================================

interface Props {
  mode: "home" | "settings";
  onOpenSettings: () => void;
  onBack: () => void;
}

export const AppHeader: React.FC<Props> = ({ mode, onOpenSettings, onBack }) => {
  const { amIAdmin } = useFeed();

  if (mode === "settings") {
    return (
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          aria-label="Back"
        >
          <Icon name="ChevronLeft" size={20} />
          <span className={styles.backLabel}>Settings</span>
        </button>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <div className={styles.title}>GitHub Release Watcher</div>
      {amIAdmin && (
        <button
          type="button"
          className={styles.gearButton}
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          {/* Decorative inside a labeled button — the parent's
              aria-label="Open settings" is what AT announces. */}
          <Icon name="Settings" size={20} />
        </button>
      )}
    </header>
  );
};
