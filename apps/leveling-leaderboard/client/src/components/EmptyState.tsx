import React from "react";
import styles from "./EmptyState.module.css";
import { Icon } from "./Icon";

// Consistent empty state: optional icon + title + optional body + optional action.
// See DESIGN.md View states.

interface Props {
  title: string;
  body?: string;
  action?: React.ReactNode;
  // Icon name from the DevKit icon set. Optional — omit for a text-only state.
  iconName?: string;
}

export const EmptyState: React.FC<Props> = ({ title, body, action, iconName }) => {
  return (
    <div className={styles.empty}>
      {iconName && (
        <span className={styles.icon}>
          <Icon name={iconName} size={48} />
        </span>
      )}
      <h3 className={styles.title}>{title}</h3>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
