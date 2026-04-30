import React from "react";
import styles from "./EmptyState.module.css";

// Consistent empty state: optional icon + title + optional body + optional
// action. See DESIGN.md View states.
//
// `icon` is any pre-sized React node — typically a lucide-react icon at
// size={48}. Component-agnostic so callers stay portable across icon
// libraries.

interface Props {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({ title, body, action, icon }) => {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <h3 className={styles.title}>{title}</h3>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
