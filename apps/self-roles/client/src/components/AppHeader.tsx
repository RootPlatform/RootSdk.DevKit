import React from "react";
import styles from "./AppHeader.module.css";
import { Icon } from "./Icon";

// ============================================================================
// AppHeader — top bar for the single-view app. Two modes:
//
//   * "home"     — app title on the left, gear icon on the right (gear only
//                  renders when `showSettingsButton` is true).
//   * "settings" — back chevron + "Settings" label on the left, nothing on
//                  the right. Caller handles the push-view pop via onBack.
//
// 48px tall, no border — the content's own card surfaces provide the visual
// separation. Keeping it borderless avoids a double-line against the picker
// panel below. The header sits above the scrolling content region (see
// App.module.css), so it stays visible without needing position:sticky.
//
// `title` and `showSettingsButton` are PROPS rather than baked-in / read
// from a hook so the component is app-agnostic and copies verbatim into
// any Root sample. Apps pass their own brand title and admin gate from
// the shell's state container.
// ============================================================================

interface Props {
  title: string;
  mode: "home" | "settings";
  showSettingsButton: boolean;
  onOpenSettings: () => void;
  onBack: () => void;
}

export const AppHeader: React.FC<Props> = ({
  title,
  mode,
  showSettingsButton,
  onOpenSettings,
  onBack,
}) => {
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
      <div className={styles.title}>{title}</div>
      {showSettingsButton && (
        <button
          type="button"
          className={styles.gearButton}
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          {/* Decorative inside a labeled button — the parent's
              aria-label="Open settings" is what AT announces. Adding a
              `title` would make the icon also expose role="img"
              aria-label="Settings", causing AT to read both. */}
          <Icon name="Settings" size={20} />
        </button>
      )}
    </header>
  );
};
