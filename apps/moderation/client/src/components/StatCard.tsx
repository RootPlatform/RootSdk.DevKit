import React from "react";
import styles from "./StatCard.module.css";
import { IconBox, IconBoxAccent } from "./IconBox";

interface Props {
  label: string;
  value: React.ReactNode;
  // Pass any pre-sized icon node (typically a lucide-react icon at
  // size={20}). Component-agnostic so callers don't need to learn an
  // app-specific icon API — `<Shield size={20} />` is enough.
  icon?: React.ReactNode;
  accent?: IconBoxAccent;
  // Optional subtle line under the value (e.g., "Last 24 hours").
  subtle?: React.ReactNode;
  // Optional trend pill (e.g., "+12% vs prev"). Direction maps to
  // brand-secondary (up) or error (down).
  trend?: {
    direction: "up" | "down";
    label: string;
  };
}

// StatCard — labelled metric tile with a tinted icon box. Used three-up
// on Dashboard and Analytics. Layout: label + value + optional subtle/
// trend on the left; IconBox on the right.
export const StatCard: React.FC<Props> = ({
  label,
  value,
  icon,
  accent = "brand",
  subtle,
  trend,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.body}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {subtle && <span className={styles.subtle}>{subtle}</span>}
        {trend && (
          <span
            className={`${styles.trend} ${
              trend.direction === "up" ? styles.trendUp : styles.trendDown
            }`}
          >
            {trend.direction === "up" ? "↗" : "↘"} {trend.label}
          </span>
        )}
      </div>
      {icon && (
        <IconBox accent={accent} size={40}>
          {icon}
        </IconBox>
      )}
    </div>
  );
};
