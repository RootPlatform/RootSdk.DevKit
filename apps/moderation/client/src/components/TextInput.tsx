import React from "react";
import styles from "./TextInput.module.css";

// Labeled text input. Used for the typed-confirm inputs.

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}

export const TextInput: React.FC<Props> = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
}) => {
  return (
    <label className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <input
        className={styles.input}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
};
