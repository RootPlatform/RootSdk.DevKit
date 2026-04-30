import React from "react";
import styles from "./Pill.module.css";

interface Props {
  children: React.ReactNode;
  // Optional `#`-style prefix, rendered in muted color (e.g., for channel
  // pills). Distinct from a literal child string so the prefix can stay
  // consistently styled even when consumers compose the body differently.
  prefix?: string;
  tone?: "neutral" | "info";
  className?: string;
}

// Pill — monospace content chip for `# channel-name` references and
// matched-term display. See Badge for status indicators.
export const Pill: React.FC<Props> = ({
  children,
  prefix,
  tone = "neutral",
  className = "",
}) => {
  const toneClass = tone === "info" ? styles["tone-info"] : "";
  return (
    <span className={`${styles.pill} ${toneClass} ${className}`}>
      {prefix && <span className={styles.prefix}>{prefix}</span>}
      {children}
    </span>
  );
};
