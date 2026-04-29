import React, { forwardRef } from "react";
import styles from "./TextInput.module.css";

// Labeled text input. Used for the add-repo URL field.

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  invalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, Props>(
  ({ label, value, onChange, hint, invalid, className, ...rest }, ref) => {
    const inputClass = [
      styles.input,
      invalid ? styles.invalid : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <label className={styles.wrapper}>
        {label && <span className={styles.label}>{label}</span>}
        <input
          ref={ref}
          className={inputClass}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
        {hint && <span className={styles.hint}>{hint}</span>}
      </label>
    );
  },
);

TextInput.displayName = "TextInput";
