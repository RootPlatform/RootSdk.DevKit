import React from "react";
import styles from "./Badge.module.css";

export type BadgeVariant =
  | "default"
  | "info"
  | "warning"
  | "error"
  | "success";

interface Props {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// Badge — small status pill. See Badge.module.css for the variant→token
// mapping. The default variant uses neutral background-tertiary +
// text-secondary; status variants share one background/border recipe via
// a `--tone` custom property keyed off the Root status token.
export const Badge: React.FC<Props> = ({
  variant = "default",
  children,
  className = "",
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
