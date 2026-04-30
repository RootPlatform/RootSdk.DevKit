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
// Optional reason input: pass `collectReason` to render a textarea
// between the prompt and the actions. The typed text flows to onCommit
// as its argument; an empty string is fine (admins can skip when the
// context is obvious). Length is bounded by `reasonMaxLength`. Server
// validates the cap server-side regardless.
//
// For higher-stakes actions (resetting accumulated user data, deleting
// community-generated content), reach for a type-to-confirm pattern
// instead. See apps/leveling-leaderboard/DESIGN.md.

interface Props {
  prompt: string;
  commitLabel?: string;
  cancelLabel?: string;
  // When true, renders a reason textarea above the actions; the
  // typed text flows into onCommit's argument. When false (default),
  // onCommit is called with an empty string — backward-compatible
  // with existing call sites that ignore the argument.
  collectReason?: boolean;
  reasonPlaceholder?: string;
  reasonMaxLength?: number;
  onCommit: (reason: string) => Promise<void> | void;
  onCancel: () => void;
}

const DEFAULT_REASON_MAX = 500;

export const InlineConfirm: React.FC<Props> = ({
  prompt,
  commitLabel = "Remove",
  cancelLabel = "Cancel",
  collectReason = false,
  reasonPlaceholder = "Reason for the audit log (optional)",
  reasonMaxLength = DEFAULT_REASON_MAX,
  onCommit,
  onCancel,
}) => {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const handleCommit = async () => {
    setBusy(true);
    try {
      await onCommit(collectReason ? reason.trim() : "");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.confirm} role="alertdialog" aria-label={prompt}>
      <p className={styles.prompt}>{prompt}</p>
      {collectReason && (
        <textarea
          className={styles.reasonInput}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={reasonPlaceholder}
          maxLength={reasonMaxLength}
          disabled={busy}
          rows={2}
          aria-label="Reason for the audit log"
        />
      )}
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
