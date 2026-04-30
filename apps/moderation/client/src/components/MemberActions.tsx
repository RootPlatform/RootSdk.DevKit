import React, { useState } from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import { withClientRetry } from "../lib/retry";
import { InlineConfirm } from "./InlineConfirm";
import styles from "./MemberActions.module.css";

// MemberActions — admin-only Kick / Ban affordances scoped to a target user.
// Used in audit log rows and dashboard recent-activity rows so an admin
// looking at a moderation event can act on the user who triggered it.
//
// Each action goes through an inline two-step confirm. Errors render
// beneath the confirm so an admin sees why a kick or ban failed (e.g.,
// target is the community owner, target left the community).

interface Props {
  userId: string;
  // Optional display name for the prompt. Falls back to a truncated id.
  username?: string;
  // Called after a successful action so the parent can refetch / update.
  onActed?: () => void;
}

type Mode = "idle" | "kick" | "ban";

export const MemberActions: React.FC<Props> = ({
  userId,
  username,
  onActed,
}) => {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | undefined>(undefined);

  const label = username || `${userId.slice(0, 8)}…`;

  const commit = async (action: "kick" | "ban") => {
    setError(undefined);
    try {
      if (action === "kick") {
        await withClientRetry(() =>
          moderationServiceClient.kickMember({ userId, note: "" }),
        );
      } else {
        await withClientRetry(() =>
          moderationServiceClient.banMember({ userId, reason: "" }),
        );
      }
      setMode("idle");
      onActed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (mode === "idle") {
    return (
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          onClick={() => setMode("kick")}
        >
          Kick
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => setMode("ban")}
        >
          Ban
        </button>
      </div>
    );
  }

  return (
    <div className={styles.confirmWrap}>
      <InlineConfirm
        prompt={
          mode === "kick"
            ? `Kick ${label} from the community? They can rejoin via invite.`
            : `Ban ${label} from the community? Past behavior is recorded; they cannot rejoin without an unban.`
        }
        commitLabel={mode === "kick" ? "Kick" : "Ban"}
        onCancel={() => {
          setMode("idle");
          setError(undefined);
        }}
        onCommit={() => commit(mode)}
      />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};
