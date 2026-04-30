import React from "react";
import styles from "./IconBox.module.css";

export type IconBoxAccent =
  | "brand"
  | "warning"
  | "error"
  | "info"
  | "success"
  | "neutral";

interface Props {
  children: React.ReactNode;
  accent?: IconBoxAccent;
  size?: 32 | 40;
  className?: string;
}

// IconBox — tinted square wrapping an icon. Used as the visual primitive
// for StatCards, the sidebar identity card, and dashboard recent-activity
// rows. The accent maps to a Root status token; tints come from
// color-mix at 12% opacity (matches the canonical first-party recipe).
//
// Usage (icons typically come from lucide-react):
//   <IconBox accent="brand" size={40}><Shield size={20} /></IconBox>
//   <IconBox accent="warning"><MessageSquareOff size={20} /></IconBox>
export const IconBox: React.FC<Props> = ({
  children,
  accent = "brand",
  size = 32,
  className = "",
}) => {
  const sizeClass = size === 40 ? styles.size40 : styles.size32;
  return (
    <span className={`${styles.box} ${styles[accent]} ${sizeClass} ${className}`}>
      {children}
    </span>
  );
};
