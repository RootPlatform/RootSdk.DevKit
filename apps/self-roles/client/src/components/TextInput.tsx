import React from "react";
import styles from "./TextInput.module.css";

// Labeled text input. Used by the typed-confirm flows (label + hint slots) and
// by free-form admin form fields (label-less + maxLength + custom className).

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  "aria-label"?: string;
}

export const TextInput: React.FC<Props> = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
  maxLength,
  className,
  "aria-label": ariaLabel,
}) => {
  return (
    <label className={[styles.wrapper, className].filter(Boolean).join(" ")}>
      {label && <span className={styles.label}>{label}</span>}
      <input
        className={styles.input}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        aria-label={ariaLabel}
      />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
};
