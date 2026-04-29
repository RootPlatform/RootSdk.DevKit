import React from "react";
import styles from "./Loader.module.css";

// Minimal spinner. Pure CSS, no extra deps. See DESIGN.md View states.

export const Loader: React.FC = () => {
  return (
    <div className={styles.loader} role="status" aria-label="Loading">
      <div className={styles.spinner} />
    </div>
  );
};
