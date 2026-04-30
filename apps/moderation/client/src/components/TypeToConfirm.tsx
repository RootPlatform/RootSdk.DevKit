import React, { useState } from "react";
import styles from "./TypeToConfirm.module.css";

// TypeToConfirm — high-friction confirmation for destructive bulk actions.
// The user must type a canonical phrase character-for-character (case-
// insensitive, trim-aware) before the commit button enables. Sits beside
// InlineConfirm, which handles the lower-stakes two-click confirms.
//
// When to reach for which:
//
//   InlineConfirm    — well-bounded, mostly-recoverable: removing a single
//                      word, kicking a member, deleting a single message.
//                      Two-click flow keeps the friction proportional to
//                      the scope of the action.
//
//   TypeToConfirm    — irreversible bulk operations: clearing the audit
//                      log, resetting a stats table, purging a list. The
//                      typing requirement defends against muscle-memory
//                      double-clicks; the explicit phrase keeps the
//                      action's intent unmissable.
//
// Phrase compare uses `trim().toLowerCase()` — strict casing or surrounding
// whitespace is more cargo-cult than safety, and "Clear Audit Log" with a
// stray space is still an explicit type-out of the phrase. The server
// re-validates with the same normalization as defence in depth.

interface Props {
  // The canonical phrase. Compared in lower-case + trim, so callers should
  // pass the lower-case form (e.g. "clear audit log").
  confirmationPhrase: string;
  // The full prompt rendered above the input. Should reference the
  // confirmationPhrase verbatim so users know what to type without parsing
  // around quotes or surrounding sentences.
  prompt: string;
  commitLabel: string;
  // Resolves when the action completes; the component handles its own busy
  // state during the await. The caller is responsible for surfacing errors
  // (we render the thrown message directly beneath the input).
  onCommit: () => Promise<void>;
  // Optional. If absent, no Cancel button is rendered — useful when the
  // host already provides one (e.g., a parent confirm modal).
  onCancel?: () => void;
}

export const TypeToConfirm: React.FC<Props> = ({
  confirmationPhrase,
  prompt,
  commitLabel,
  onCommit,
  onCancel,
}) => {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const matches = typed.trim().toLowerCase() === confirmationPhrase;
  const canCommit = matches && !busy;

  const handleCommit = async () => {
    if (!canCommit) return;
    setError(undefined);
    setBusy(true);
    try {
      await onCommit();
      // Clear on success so a second use of the same component starts
      // fresh. The host typically unmounts us on success anyway, but this
      // guards against re-use in long-lived parents.
      setTyped("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // Enter-to-submit when the phrase matches. We use a real <form> so the
  // browser handles the implicit submit on Enter and screen readers
  // announce the form context — preventDefault stops the page navigation
  // that a form would otherwise attempt.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleCommit();
  };
  return (
    <form className={styles.confirm} onSubmit={handleSubmit}>
      <p className={styles.prompt}>{prompt}</p>
      <input
        type="text"
        className={styles.input}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={confirmationPhrase}
        disabled={busy}
        // Focus the input on mount so the admin can type immediately
        // after the disclosure opens — saves a click and matches the
        // intent of having committed to the destructive flow.
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={`Type "${confirmationPhrase}" to confirm`}
      />
      <div className={styles.actions}>
        {onCancel && (
          <button
            type="button"
            className={styles.cancel}
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={styles.commit}
          disabled={!canCommit}
        >
          {busy ? "Working…" : commitLabel}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
};
