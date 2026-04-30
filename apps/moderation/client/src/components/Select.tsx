import React from "react";
import styles from "./Select.module.css";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  // Width override (default = auto-size to content).
  className?: string;
}

// Select — native <select> styled per the design-tokens `native-select`
// pattern. Generic so callers preserve their value type (string | number);
// numeric values come back via Number(e.target.value) since DOM
// always serializes to string.
export function Select<T extends string | number>({
  label,
  value,
  onChange,
  options,
  className = "",
}: Props<T>): React.ReactElement {
  const isNumeric = typeof value === "number";
  return (
    <label className={`${styles.wrapper} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <select
        className={styles.select}
        value={value}
        onChange={(e) => {
          const next = isNumeric
            ? (Number(e.target.value) as T)
            : (e.target.value as T);
          onChange(next);
        }}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
