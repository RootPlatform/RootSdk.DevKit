import React from "react";
import { AlertCircle } from "lucide-react";
import styles from "./QueryError.module.css";
import { Button } from "./Button";

// Consistent error state with a Retry button. See DESIGN.md View states.

interface Props {
  message?: string;
  onRetry: () => void | Promise<void>;
}

export const QueryError: React.FC<Props> = ({ message, onRetry }) => {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.icon}>
        <AlertCircle size={32} />
      </span>
      <p className={styles.message}>
        {message ?? "Something went wrong."}
      </p>
      <Button variant="outline" onClick={() => onRetry()}>
        Retry
      </Button>
    </div>
  );
};
