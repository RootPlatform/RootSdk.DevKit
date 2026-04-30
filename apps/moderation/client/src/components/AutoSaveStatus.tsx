import React from "react";
import styles from "./AutoSaveStatus.module.css";

// AutoSaveStatus — inline error pill for auto-save failures.
//
// Intentionally does NOT show a "Saving…" indicator. A transient pill
// flashing per keystroke is too brief to read and causes layout shift.
// Successful saves are invisible — the user trusts that changes persist.
// Only failures get chrome: a sticky error with Retry + Dismiss that stays
// until the user resolves it.
//
// Adapted from apps/leveling-leaderboard/client/src/components/AutoSaveStatus.tsx
// without the Icon dependency (Icon is copied in Phase 4).

interface Props {
  error: Error | undefined;
  onRetry: () => void;
  onDismissError: () => void;
}

export const AutoSaveStatus: React.FC<Props> = ({
  error,
  onRetry,
  onDismissError,
}) => {
  if (!error) return null;
  return (
    <div className={styles.status} role="alert">
      <span className={styles.text}>
        Couldn't save — {error.message || "something went wrong"}.
      </span>
      <button type="button" className={styles.action} onClick={onRetry}>
        Retry
      </button>
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismissError}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};
