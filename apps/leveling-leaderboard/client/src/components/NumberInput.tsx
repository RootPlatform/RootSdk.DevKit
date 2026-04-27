import React, { useEffect, useRef, useState } from "react";
import styles from "./NumberInput.module.css";

// ============================================================================
// NumberInput — labeled integer input with min/max.
//
// Holds the raw string as internal state so clearing or mid-typing doesn't
// round-trip through `Number("") === 0` and clobber the parent's value with
// a spurious 0. Commits a parsed (and floored) integer to the parent only
// when the input text parses to a finite number. On blur, clamps to [min,max]
// and restores the last committed value if the field is empty or invalid.
//
// External-value sync: when the parent's `value` changes (admin pasted a
// new value, an external broadcast updated state, etc.) we ONLY sync the
// display when the user isn't actively focused on this input. Without
// this guard, typing "030" while a broadcast arrives mid-keystroke would
// wipe the intermediate state.
// ============================================================================

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  hint?: string;
}

export const NumberInput: React.FC<Props> = ({ label, value, onChange, min, max, hint }) => {
  const [display, setDisplay] = useState<string>(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display from external value only when the user isn't currently
  // typing into this input. See header comment.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDisplay(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    if (raw === "" || raw === "-") return; // allow intermediate states while typing
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const floored = Math.floor(n);
    // Don't propagate out-of-range values to the parent. The auto-save layer
    // would otherwise debounce a doomed RPC and the user would see a transient
    // error pill flash for "Invalid settings" while they're mid-typing.
    // handleBlur clamps and commits the final value when the field loses focus.
    if (floored < min || floored > max) return;
    onChange(floored);
  };

  const handleBlur = () => {
    if (display === "") {
      // Empty — restore last committed value.
      setDisplay(String(value));
      return;
    }
    const n = Number(display);
    if (!Number.isFinite(n)) {
      setDisplay(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, Math.floor(n)));
    if (clamped !== value) onChange(clamped);
    setDisplay(String(clamped));
  };

  return (
    <label className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      <input
        ref={inputRef}
        className={styles.input}
        type="number"
        step="1"
        value={display}
        min={min}
        max={max}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {hint && <span className={styles.hint}>{hint}</span>}
      <span className={styles.rangeHint}>
        Range: {min.toLocaleString()}–{max.toLocaleString()}
      </span>
    </label>
  );
};
