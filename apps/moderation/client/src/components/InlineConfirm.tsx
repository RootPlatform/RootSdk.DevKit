import React, { useState } from "react";
import styles from "./InlineConfirm.module.css";

// InlineConfirm — two-step inline confirm pattern for low-stakes
// destructive actions. No modal. The triggering control swaps to a
// `Cancel | <commit>` pair with a one-line prompt above.
//
// Usage:
//   const [pending, setPending] = useState(false);
//   {pending ? (
//     <InlineConfirm
//       prompt="Remove this word?"
//       commitLabel="Remove"
//       onCancel={() => setPending(false)}
//       onCommit={async () => { await doRemove(); setPending(false); }}
//     />
//   ) : (
//     <Button onClick={() => setPending(true)}>…</Button>
//   )}
//
// For higher-stakes actions (resetting accumulated user data, deleting
// community-generated content), reach for a type-to-confirm pattern
// instead. See apps/leveling-leaderboard/DESIGN.md.

interface Props {
  prompt: string;
  commitLabel?: string;
  cancelLabel?: string;
  onCommit: () => Promise<void> | void;
  onCancel: () => void;
}

export const InlineConfirm: React.FC<Props> = ({
  prompt,
  commitLabel = "Remove",
  cancelLabel = "Cancel",
  onCommit,
  onCancel,
}) => {
  const [busy, setBusy] = useState(false);
  const handleCommit = async () => {
    setBusy(true);
    try {
      await onCommit();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.confirm} role="alertdialog" aria-label={prompt}>
      <p className={styles.prompt}>{prompt}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancel}
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={styles.commit}
          onClick={() => void handleCommit()}
          disabled={busy}
        >
          {busy ? "Working…" : commitLabel}
        </button>
      </div>
    </div>
  );
};
