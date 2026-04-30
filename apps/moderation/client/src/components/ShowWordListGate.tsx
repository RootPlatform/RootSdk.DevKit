import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./ShowWordListGate.module.css";

interface Props {
  // Visible help text shown beneath the toggle when hidden.
  hiddenHelpText?: string;
  // Custom labels — defaults match the moderation app's word list copy.
  showLabel?: string;
  hideLabel?: string;
  children: React.ReactNode;
}

const DEFAULT_HIDDEN_HELP =
  "Word list is hidden because it may contain offensive content. " +
  "Click “Show word list” to view and manage words.";

// ShowWordListGate — defaults to hidden. Reveal requires an explicit
// click. Used wrapping the moderation app's slur/profanity/custom word
// list bodies so an admin's screen doesn't display offensive content
// just because they opened the Settings tab.
export const ShowWordListGate: React.FC<Props> = ({
  hiddenHelpText = DEFAULT_HIDDEN_HELP,
  showLabel = "Show word list",
  hideLabel = "Hide word list",
  children,
}) => {
  const [shown, setShown] = useState(false);
  return (
    <div className={styles.gate}>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={styles.button}
          onClick={() => setShown((v) => !v)}
          aria-expanded={shown}
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
          {shown ? hideLabel : showLabel}
        </button>
      </div>
      {shown ? (
        children
      ) : (
        <p className={styles.help}>{hiddenHelpText}</p>
      )}
    </div>
  );
};
