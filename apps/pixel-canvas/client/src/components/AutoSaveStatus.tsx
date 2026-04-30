import React from "react";
import { AlertCircle, X } from "lucide-react";
import styles from "./AutoSaveStatus.module.css";

// ============================================================================
// AutoSaveStatus — inline error pill for auto-save failures.
//
// Intentionally does NOT show a "Saving…" indicator. A transient pill that
// appears for ~150ms per keystroke is too brief to read and causes layout
// shift. Successful saves are invisible — the user trusts that changes to a
// field persist. Only failures get chrome: a sticky error with Retry +
// Dismiss that stays until the user resolves it.
// ============================================================================

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
    <div className={`${styles.status} ${styles.errorState}`} role="alert">
      <AlertCircle size={14} />
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
        <X size={12} />
      </button>
    </div>
  );
};
