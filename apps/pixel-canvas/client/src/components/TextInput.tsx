import React from "react";
import styles from "./TextInput.module.css";

// Labeled text input. Used by the typed-confirm flows (label + hint slots) and
// by free-form admin form fields (label-less + maxLength + custom className).
//
// Extends the native <input>'s attribute set so any aria-/data- prop a
// caller adds (aria-invalid, aria-describedby, data-testid, etc.) gets
// forwarded to the underlying <input>. Without this pass-through, a
// caller passing `aria-invalid` would compile (React's type system is
// permissive about aria-* keys at the JSX level) but the prop would
// silently never reach the DOM — visual styling would apply via
// className, but screen readers would never hear the field is invalid.
// Mirrors the pattern Button uses (extends ButtonHTMLAttributes).
//
// `value`, `onChange`, and `className` use this component's stricter
// callback shape and are omitted from the extended type to avoid clashes
// with the native HTMLInputElement signatures.

type ForwardedInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "className"
>;

interface Props extends ForwardedInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  className?: string;
}

export const TextInput: React.FC<Props> = ({
  label,
  value,
  onChange,
  hint,
  className,
  ...rest
}) => {
  return (
    <label className={[styles.wrapper, className].filter(Boolean).join(" ")}>
      {label && <span className={styles.label}>{label}</span>}
      <input
        {...rest}
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
};
