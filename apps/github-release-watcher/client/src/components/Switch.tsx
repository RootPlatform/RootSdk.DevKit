import React from "react";
import styles from "./Switch.module.css";

// ============================================================================
// Switch — boolean toggle, follows the design-system-reference's `switch`
// component pattern. Accessible (role="switch", aria-checked).
//
// Used in RepoRow for the per-repo `include_prereleases` toggle. Click or
// keyboard activation flips the state.
// ============================================================================

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Accessible label for the switch — required because there's no visible
  // text inside the control itself; an adjacent label is supplied by the
  // caller (e.g., "pre" in RepoRow), but assistive tech needs the full
  // description here.
  ariaLabel: string;
  disabled?: boolean;
}

export const Switch: React.FC<Props> = ({ checked, onChange, ariaLabel, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={styles.switch}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );
};
