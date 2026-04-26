import React from "react";
import styles from "./RoleToggle.module.css";
import type { PickerRole } from "@selfroles/gen-shared";

// ============================================================================
// RoleToggle — one row in the picker. Renders the role's name + color swatch +
// optional description, with a checkbox-or-radio control on the right.
//
// Two modes (driven by the parent group's `exclusive` flag):
//   * "checkbox" — independent toggle. Clicking flips this role on/off.
//   * "radio"    — exclusive group. Clicking an OFF row turns it on AND the
//                  server clears any other selected sibling. Clicking an ON
//                  row turns it OFF (zero-selected is a valid state).
//
// Why click-to-clear on an active radio (vs native radio behavior):
// Native HTML radios assume "exactly one of N must be selected" because
// they're built for required form fields. A self-serve picker doesn't have
// that constraint — "I don't want to declare a region right now" is a
// legitimate state, and forcing members to either keep their first choice
// or pick another feels like a trap. Click-to-clear is the smallest UX
// escape valve. A "None" synthetic row would clutter the picker; a "Clear"
// button is extra chrome. Mainstream precedent: Material UI's
// ToggleButtonGroup with `exclusive` does this same thing.
//
// ARIA imperfection: role="radio" strictly implies "always-one-selected,"
// so click-to-clear technically violates the contract for screen readers
// that take the role at its word. The trade-off is acceptable for a
// sample's UX win; a strictly-correct alternative is role="listbox" +
// role="option" but that's a bigger refactor for visuals most users
// recognize less well.
//
// Three input states:
//   * pending  — server round-trip in flight; row is dimmed and click-blocked.
//   * disabled — server reported this role as unassignable (permission
//                subset failure — see rolePickerService.assignabilityException).
//                Row is dimmed AND we render a one-line hint underneath the
//                role name so the member knows it's not transient.
//   * default  — clickable.
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
  // Permanently un-clickable for this session (e.g., after a
  // ROLE_NOT_ASSIGNABLE failure). Renders a hint line and locks the row.
  disabled?: boolean;
  onToggle: (desired: boolean) => void;
}

export const RoleToggle: React.FC<Props> = ({
  role,
  on,
  exclusive,
  pending,
  disabled = false,
  onToggle,
}) => {
  const inactive = pending || disabled;

  const handleClick = () => {
    if (inactive) return;
    // Click-to-toggle in both modes. For exclusive groups this means an
    // active radio CAN be cleared by clicking it again — see the header
    // comment for the rationale (zero-selected is a valid state for a
    // self-serve picker; forcing members to keep one feels like a trap).
    onToggle(!on);
  };

  return (
    <button
      type="button"
      className={styles.row}
      onClick={handleClick}
      disabled={inactive}
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
        {disabled ? (
          <span className={styles.unassignableHint}>
            Can&rsquo;t be assigned by this app — ask an admin to remove it.
          </span>
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
