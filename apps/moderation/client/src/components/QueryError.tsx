import React from "react";
import styles from "./QueryError.module.css";
import { Button } from "./Button";

interface Props {
  message?: string;
  onRetry: () => void | Promise<void>;
}

export const QueryError: React.FC<Props> = ({ message, onRetry }) => {
  return (
    <div className={styles.error} role="alert">
      <p className={styles.message}>{message ?? "Something went wrong."}</p>
      <Button onClick={() => void onRetry()}>Retry</Button>
    </div>
  );
};
