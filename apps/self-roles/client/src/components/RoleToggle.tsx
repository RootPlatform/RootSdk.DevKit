import React from "react";
import styles from "./RoleToggle.module.css";
import type { PickerRole } from "@selfroles/gen-shared";

// ============================================================================
// RoleToggle — one row in the picker. Renders the role's name + color swatch +
// optional description, with a checkbox-or-radio control on the right.
//
// Two modes (driven by the parent group's `exclusive` flag):
//   * "checkbox" — independent toggle. Clicking flips this role on/off.
//   * "radio"    — exclusive group. Clicking turns this role ON; the parent
//                  is responsible for clearing siblings (server enforces too).
//
// Disabled state is used while a server round-trip is in flight (parent
// passes pending=true). Prevents double-clicks producing two toggles.
//
// Color swatch: the role's platform-set colorHex when present; falls back to
// a neutral border-color token so swatch slots stay aligned for roles
// without a color.
// ============================================================================

interface Props {
  role: PickerRole;
  on: boolean;
  exclusive: boolean;
  pending: boolean;
  onToggle: (desired: boolean) => void;
}

export const RoleToggle: React.FC<Props> = ({
  role,
  on,
  exclusive,
  pending,
  onToggle,
}) => {
  const handleClick = () => {
    if (pending) return;
    if (exclusive) {
      // Radio semantics: clicking an OFF radio turns it on; clicking an ON
      // radio is a no-op (don't allow members to clear an exclusive
      // selection by clicking the active option — they pick another in the
      // group instead). This matches native radio-input behavior.
      if (!on) onToggle(true);
    } else {
      onToggle(!on);
    }
  };

  return (
    <button
      type="button"
      className={styles.row}
      onClick={handleClick}
      disabled={pending}
      role={exclusive ? "radio" : "checkbox"}
      aria-checked={on}
      aria-busy={pending}
    >
      <span
        className={styles.swatch}
        style={role.color ? { backgroundColor: role.color } : undefined}
        aria-hidden="true"
      />
      <span className={styles.body}>
        <span className={styles.name}>{role.name}</span>
        {role.description ? (
          <span className={styles.description}>{role.description}</span>
        ) : null}
      </span>
      <span
        className={[
          exclusive ? styles.radio : styles.checkbox,
          on ? styles.indicatorOn : styles.indicatorOff,
        ].join(" ")}
        aria-hidden="true"
      >
        {on && !exclusive ? "✓" : null}
      </span>
    </button>
  );
};
