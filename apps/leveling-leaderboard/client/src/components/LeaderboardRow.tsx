import React, { useEffect, useRef, useState } from "react";
import styles from "./LeaderboardRow.module.css";
import { Avatar } from "./Avatar";
import type { LeaderboardEntry } from "../contexts/LeaderboardContext";

// ============================================================================
// LeaderboardRow — one row of rank / avatar / nickname / level / XP.
//
// Reused by:
//   * HomeView's Top 10 list
//   * HomeView's "Your position" ghost row (for users outside the top 10)
//
// Pulses briefly on XP change so the user sees live activity. Top-3 rank
// numbers get the brand-secondary color for subtle celebration. The `isMe`
// highlight (left accent + tint + "YOU" tag) is identical in both usages so
// a user's row keeps the same visual identity whether they're on the board
// or rendered as a ghost row outside it.
// ============================================================================

interface Props {
  entry: LeaderboardEntry;
  nickname: string;
  profilePictureUri: string | undefined;
  isMe: boolean;
}

export const LeaderboardRow: React.FC<Props> = ({
  entry,
  nickname,
  profilePictureUri,
  isMe,
}) => {
  const prevXpRef = useRef(entry.totalXp);
  const [pulse, setPulse] = useState(false);

  // Brief background pulse on XP change. See DESIGN.md Motion.
  useEffect(() => {
    if (entry.totalXp !== prevXpRef.current) {
      prevXpRef.current = entry.totalXp;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [entry.totalXp]);

  const topThree = entry.rank <= 3;
  const rowClass = [
    styles.row,
    pulse ? styles.pulse : "",
    topThree ? styles.topThree : "",
    isMe ? styles.me : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rowClass}>
      <div className={styles.rank}>{entry.rank}</div>
      <Avatar
        profilePictureUri={profilePictureUri}
        nickname={nickname}
        size={40}
      />
      <div className={styles.identity}>
        <div className={styles.nickname}>
          <span className={styles.nicknameText}>{nickname}</span>
          {isMe && <span className={styles.meTag}>You</span>}
        </div>
        <div className={styles.meta}>
          Level {entry.level} · {entry.totalXp.toLocaleString()} XP
        </div>
      </div>
      <div className={styles.level}>Lvl {entry.level}</div>
      <div className={styles.xp}>{entry.totalXp.toLocaleString()} XP</div>
    </div>
  );
};
