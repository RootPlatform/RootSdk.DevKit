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
//
// Ban additionally surfaces a duration picker (Permanent / 1 day / 7 days
// / 30 days). "Permanent" preserves the pre-temp-ban default; the others
// translate to a future ms-epoch sent in BanMemberRequest.expiresAt — the
// SDK lifts the ban automatically when the timestamp passes. Custom dates
// are deferred behind the four canned choices that cover the common cases.

interface Props {
  userId: string;
  // Optional display name for the prompt. Falls back to a truncated id.
  username?: string;
  // Called after a successful action so the parent can refetch / update.
  onActed?: () => void;
}

type Mode = "idle" | "kick" | "ban";

interface BanDurationOption {
  key: string;
  label: string;
  // ms offset from now; 0 means permanent.
  offsetMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BAN_DURATIONS: readonly BanDurationOption[] = [
  { key: "perm", label: "Permanent", offsetMs: 0 },
  { key: "1d", label: "1 day", offsetMs: 1 * DAY_MS },
  { key: "7d", label: "7 days", offsetMs: 7 * DAY_MS },
  { key: "30d", label: "30 days", offsetMs: 30 * DAY_MS },
];

export const MemberActions: React.FC<Props> = ({
  userId,
  username,
  onActed,
}) => {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  // Default to permanent ban — preserves the pre-temp-ban semantics so
  // existing admin muscle memory (click Ban, confirm) keeps producing a
  // permanent ban without an extra step.
  const [banDuration, setBanDuration] =
    useState<BanDurationOption>(BAN_DURATIONS[0]);

  const label = username || `${userId.slice(0, 8)}…`;

  const commitKick = async (reason: string) => {
    setError(undefined);
    try {
      await withClientRetry(() =>
        moderationServiceClient.kickMember({ userId, reason }),
      );
      setMode("idle");
      onActed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const commitBan = async (reason: string) => {
    setError(undefined);
    try {
      const expiresAt =
        banDuration.offsetMs > 0
          ? BigInt(Date.now() + banDuration.offsetMs)
          : BigInt(0);
      await withClientRetry(() =>
        moderationServiceClient.banMember({
          userId,
          reason,
          expiresAt,
        }),
      );
      setMode("idle");
      setBanDuration(BAN_DURATIONS[0]);
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
          onClick={() => {
            setBanDuration(BAN_DURATIONS[0]);
            setMode("ban");
          }}
        >
          Ban
        </button>
      </div>
    );
  }

  if (mode === "kick") {
    return (
      <div className={styles.confirmWrap}>
        <InlineConfirm
          prompt={`Kick ${label} from the community? They can rejoin via invite.`}
          commitLabel="Kick"
          collectReason
          onCancel={() => {
            setMode("idle");
            setError(undefined);
          }}
          onCommit={commitKick}
        />
        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  // mode === "ban"
  const banPrompt =
    banDuration.offsetMs > 0
      ? `Ban ${label} for ${banDuration.label.toLowerCase()}? They can rejoin once the ban lifts; you can unban earlier from Root's native Members UI.`
      : `Ban ${label} from the community permanently? They cannot rejoin without an unban.`;
  return (
    <div className={styles.confirmWrap}>
      {/* Duration picker: a row of segmented buttons above the confirm so
          the admin's selection is in scope when they read the prompt. The
          prompt itself reflects the chosen duration so the consequences
          stay legible. */}
      <div
        className={styles.durationPicker}
        role="radiogroup"
        aria-label="Ban duration"
      >
        {BAN_DURATIONS.map((opt) => {
          const active = opt.key === banDuration.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              className={
                active
                  ? `${styles.durationButton} ${styles.durationButtonActive}`
                  : styles.durationButton
              }
              onClick={() => setBanDuration(opt)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <InlineConfirm
        prompt={banPrompt}
        commitLabel="Ban"
        collectReason
        onCancel={() => {
          setMode("idle");
          setError(undefined);
        }}
        onCommit={commitBan}
      />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};
