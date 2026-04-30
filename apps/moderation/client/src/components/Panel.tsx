import React from "react";
import styles from "./Panel.module.css";

interface Props {
  // Optional header. If `title` is set, the header row renders.
  title?: React.ReactNode;
  description?: React.ReactNode;
  // Right-aligned slot in the header row (e.g., a count badge or a button).
  action?: React.ReactNode;
  // Content padding tuning. Default = 20px all sides; "tight" = 12px vertical;
  // "flush" = 0 (caller takes full responsibility, e.g., a table that needs
  // to extend edge-to-edge under the rounded panel border).
  bodyPadding?: "default" | "tight" | "flush";
  children: React.ReactNode;
  className?: string;
}

// Panel — the canonical Root header+body container, matching the `panel`
// componentPattern from apps/themes/.../design-tokens.json. Use anywhere
// you'd otherwise reach for "a card with a title". For pure stat tiles
// without a header row, see <StatCard>.
export const Panel: React.FC<Props> = ({
  title,
  description,
  action,
  bodyPadding = "default",
  children,
  className = "",
}) => {
  const bodyClass =
    bodyPadding === "tight"
      ? styles.bodyTight
      : bodyPadding === "flush"
        ? styles.bodyFlush
        : styles.body;
  return (
    <section className={`${styles.panel} ${className}`}>
      {title && (
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
};
