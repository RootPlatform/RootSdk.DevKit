import React, { useCallback, useEffect, useRef, useState } from "react";
import { rootClient } from "@rootsdk/client-app";
import {
  leaderboardServiceClient,
  LeaderboardServiceClientEvent,
} from "@levelingleaderboard/gen-client";
import type {
  AwardEntry,
  GetMyStatsResponse,
  MemberXpChangedEvent,
} from "@levelingleaderboard/gen-shared";
import styles from "./HomeView.module.css";
import { useLeaderboard } from "../contexts/LeaderboardContext";
import { useProfiles } from "../contexts/ProfilesContext";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { EmptyState } from "../components/EmptyState";
import { formatAbsolute, formatRelativeTime } from "../lib/relativeTime";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// HomeView — the single primary screen. Centered column with:
//
//   * Top 10 leaderboard (live; pulse on XP change; caller's own row, if
//     present, is highlighted with a "You" tag).
//   * "You" section, which takes one of three shapes:
//       - On the board: progress bar + "You're on the Top 10" + awards.
//         The caller's rank / avatar / XP is already visible in the top 10
//         list above, so we don't repeat it.
//       - Off the board, with XP: a "Your position" ghost row (identical
//         styling to a leaderboard row, with the me-highlight) + progress
//         bar + "+N XP to join Top 10" + awards. The ghost row uses the
//         same LeaderboardRow component as the top 10 list, so when the
//         caller climbs onto the board the visual identity is unchanged.
//       - Zero XP: a simple message prompting them to post.
//
// Admins open Settings via the gear in AppHeader (push-view); this component
// never renders Settings itself.
//
// Data sources:
//   * LeaderboardContext — top 10 + live updates via LeaderboardUpdated.
//   * GetMyStats RPC     — own rank/level/XP/progress/recentAwards.
//   * MemberXpChanged    — "all"-audience live updates; handler filters for
//                           the caller's own userId.
//   * ProfilesContext    — avatar + nickname for every rendered user.
//
// Reset handling:
//   * LeaderboardContext bumps `resetToken` when a LeaderboardUpdated arrives
//     with allReset=true. That retriggers the own-stats fetch here.
//   * MemberXpChanged with no award is the per-user reset signal; we clear
//     the local awards list in-place without a full refetch.
//
// Known limit on reconnect handling is documented in README.md.
// ============================================================================

export const HomeView: React.FC = () => {
  const {
    entries,
    loading: leaderboardLoading,
    error: leaderboardError,
    reload: reloadLeaderboard,
    resetToken,
  } = useLeaderboard();
  const { profiles, request } = useProfiles();

  const [myStats, setMyStats] = useState<GetMyStatsResponse | undefined>(undefined);
  const [myStatsLoading, setMyStatsLoading] = useState(true);
  const [myStatsError, setMyStatsError] = useState<Error | undefined>(undefined);

  const currentUserId = rootClient.users.getCurrentUserId();

  // Tracks whether a live MemberXpChanged has landed since the last fetch
  // started. Prevents a stale initial-fetch response from overwriting newer
  // live-event state in the race described at the handler below.
  const liveEventSinceFetchRef = useRef(false);

  const reloadMyStats = useCallback(async () => {
    setMyStatsLoading(true);
    setMyStatsError(undefined);
    liveEventSinceFetchRef.current = false;
    try {
      const response = await withClientRetry(() =>
        leaderboardServiceClient.getMyStats({}),
      );
      setMyStats((prev) => {
        // If a live MemberXpChanged already landed during this fetch, that
        // event reflects a committed server state newer than the response.
        // Keep prev. This race happens most visibly when a user earns their
        // first XP while HomeView is mounting — the initial fetch reads
        // before the XP transaction commits (returns totalXp=0) while the
        // broadcast fires post-commit (carries totalXp > 0).
        if (liveEventSinceFetchRef.current && prev) return prev;
        return response;
      });
    } catch (err: unknown) {
      setMyStatsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setMyStatsLoading(false);
    }
  }, []);

  // Initial + on-reset refetch.
  useEffect(() => {
    void reloadMyStats();
  }, [reloadMyStats, resetToken]);

  // Live updates for own stats. The event is broadcast to the "all" audience
  // (see server/src/messageHandler.ts); every connected client receives it,
  // we filter by userId. Two shapes:
  //   * award present → regular XP earn.
  //   * award absent  → ResetMemberXp; clear the local awards list.
  useEffect(() => {
    const onChanged = (event: MemberXpChangedEvent) => {
      if (event.userId !== currentUserId) return;
      liveEventSinceFetchRef.current = true;
      setMyStats((prev) => {
        const newAward = event.award;
        if (!newAward) {
          return {
            totalXp: event.totalXp,
            level: event.level,
            rank: event.rank,
            progressToNextLevel: event.progressToNextLevel,
            recentAwards: [],
          };
        }
        // prev === undefined means the initial getMyStats hasn't resolved
        // yet. Seed from the event — it carries the authoritative
        // post-transaction state. The liveEventSinceFetchRef guard in
        // reloadMyStats keeps the in-flight response from overwriting us.
        if (!prev) {
          return {
            totalXp: event.totalXp,
            level: event.level,
            rank: event.rank,
            progressToNextLevel: event.progressToNextLevel,
            recentAwards: [newAward],
          };
        }
        // Dedup: a broadcast can race an in-flight GetMyStats response and
        // deliver an award the initial fetch already included. Match on the
        // DB-assigned id, which uniquely identifies the row.
        const alreadyHas = prev.recentAwards.some(
          (a) => a.id === newAward.id,
        );
        const nextAwards = alreadyHas
          ? prev.recentAwards
          : [newAward, ...prev.recentAwards].slice(0, 20);
        return {
          ...prev,
          totalXp: event.totalXp,
          level: event.level,
          rank: event.rank,
          progressToNextLevel: event.progressToNextLevel,
          recentAwards: nextAwards,
        };
      });
    };
    leaderboardServiceClient.on(
      LeaderboardServiceClientEvent.MemberXpChanged,
      onChanged,
    );
    return () => {
      leaderboardServiceClient.off(
        LeaderboardServiceClientEvent.MemberXpChanged,
        onChanged,
      );
    };
  }, [currentUserId]);

  // Request profiles for every visible user: top-10 rows + the caller.
  // ProfilesContext dedupes and batches, so this is safe to call on every
  // entries change.
  useEffect(() => {
    const ids = entries.map((e) => e.userId);
    ids.push(currentUserId);
    request(ids);
  }, [entries, currentUserId, request]);

  // --- Combined loading / error --------------------------------------------
  // Block until both data sources have responded at least once. Partial
  // rendering (leaderboard up, you-card still spinning) produces layout shift
  // that reads worse than one more loader frame.
  const loading = leaderboardLoading || myStatsLoading;
  const error = leaderboardError ?? myStatsError;

  const onRetry = useCallback(() => {
    void reloadLeaderboard();
    void reloadMyStats();
  }, [reloadLeaderboard, reloadMyStats]);

  if (loading) return <Loader />;
  if (error) return <QueryError onRetry={onRetry} />;

  // Totally empty community: no one has earned any XP, including me.
  if (entries.length === 0 && (!myStats || myStats.totalXp === 0)) {
    return (
      <EmptyState
        iconName="Trophy"
        title="No activity yet"
        body="Post in eligible channels to start earning XP."
      />
    );
  }

  // --- Placement computation ------------------------------------------------
  // onBoard is a row-presence check, not rank math. If the caller's userId
  // appears in `entries`, their row is visible in the Top 10 and we don't
  // render a ghost row. Defensive vs. rank-math-only: keeps the "do we
  // render a ghost row?" decision tied to what's actually shown.
  const onBoard = entries.some((e) => e.userId === currentUserId);
  const boardFull = entries.length >= 10;
  const myTotalXp = myStats?.totalXp ?? 0;
  const tenthXp = boardFull ? entries[9].totalXp : 0;
  // XP needed to EXCEED the current 10th-place holder. 0 when we're on the
  // board or the board isn't full yet.
  const xpToJoin =
    onBoard || !boardFull ? 0 : Math.max(1, tenthXp + 1 - myTotalXp);

  const myProfile = profiles[currentUserId];
  const myNickname = myProfile?.nickname ?? "You";
  const myPictureUri = myProfile?.profilePictureUri;

  return (
    <div className={styles.scroll}>
      <div className={styles.home}>
      <section className={styles.leaderboard} aria-label="Top 10">
        {entries.length === 0 ? (
          <p className={styles.emptyBoard}>No one has earned XP yet.</p>
        ) : (
          entries.map((entry) => {
            const profile = profiles[entry.userId];
            return (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                nickname={profile?.nickname ?? entry.userId.slice(0, 6) + "…"}
                profilePictureUri={profile?.profilePictureUri}
                isMe={entry.userId === currentUserId}
              />
            );
          })
        )}
      </section>

      {myStats && myStats.totalXp > 0 ? (
        onBoard ? (
          <YouOnBoard stats={myStats} />
        ) : (
          <YouOffBoard
            stats={myStats}
            currentUserId={currentUserId}
            nickname={myNickname}
            profilePictureUri={myPictureUri}
            xpToJoin={xpToJoin}
            boardFull={boardFull}
          />
        )
      ) : (
        <YouZero boardFull={boardFull} />
      )}

      {myStats && myStats.recentAwards.length > 0 && (
        <section className={styles.awardsSection} aria-label="Recent awards">
          <h3 className={styles.awardsHeading}>Recent awards</h3>
          <ul className={styles.awards}>
            {myStats.recentAwards.map((a) => (
              <AwardRow key={a.id.toString()} award={a} />
            ))}
          </ul>
        </section>
      )}
      </div>
    </div>
  );
};

// --- You, on the board ------------------------------------------------------

// Shown when the caller's row is already in the top 10. No avatar/identity
// repeat — that's already visible above. Just the progress detail + a short
// confirmation line.
const YouOnBoard: React.FC<{ stats: GetMyStatsResponse }> = ({ stats }) => {
  const progressPct = progressPercent(stats.progressToNextLevel);
  return (
    <section className={styles.youCard} aria-label="Your progress">
      <ProgressBar stats={stats} />
      <div className={styles.goalLine}>
        <span className={styles.goalOnBoard}>You're on the Top 10</span>
        <span className={styles.goalAside}>
          {progressPct.toFixed(0)}% to Level {stats.level + 1}
        </span>
      </div>
    </section>
  );
};

// --- You, off the board -----------------------------------------------------

// Shown when the caller has XP but isn't in the rendered top 10. Presents a
// ghost row (same LeaderboardRow component as the top 10 list, with the me-
// highlight) labeled "Your position", followed by progress detail and the
// motivator line.
interface YouOffBoardProps {
  stats: GetMyStatsResponse;
  currentUserId: string;
  nickname: string;
  profilePictureUri: string | undefined;
  xpToJoin: number;
  boardFull: boolean;
}

const YouOffBoard: React.FC<YouOffBoardProps> = ({
  stats,
  currentUserId,
  nickname,
  profilePictureUri,
  xpToJoin,
  boardFull,
}) => {
  // Synthesise a LeaderboardEntry from stats so the shared LeaderboardRow
  // renders the ghost row identically to a real board row.
  const ghostEntry = {
    userId: currentUserId,
    rank: stats.rank,
    level: stats.level,
    totalXp: stats.totalXp,
  };

  return (
    <>
      <section className={styles.yourPositionSection} aria-label="Your position">
        <h3 className={styles.sectionHeading}>Your position</h3>
        <div className={styles.yourPositionList}>
          <LeaderboardRow
            entry={ghostEntry}
            nickname={nickname}
            profilePictureUri={profilePictureUri}
            isMe
          />
        </div>
      </section>

      <section className={styles.youCard} aria-label="Your progress">
        <ProgressBar stats={stats} />
        <div className={styles.goalLine}>
          {boardFull ? (
            <span className={styles.goalGap}>
              <strong>+{xpToJoin.toLocaleString()} XP</strong> to join Top 10
            </span>
          ) : (
            <span className={styles.goalMeta}>
              Keep earning XP to stay on the board.
            </span>
          )}
          <span className={styles.goalAside}>
            {progressPercent(stats.progressToNextLevel).toFixed(0)}% to Level {stats.level + 1}
          </span>
        </div>
      </section>
    </>
  );
};

// --- You, zero XP -----------------------------------------------------------

// Shown when the caller hasn't earned any XP yet (but the leaderboard may
// still have entries from others). No row, just a prompt.
const YouZero: React.FC<{ boardFull: boolean }> = ({ boardFull }) => (
  <section className={styles.youCard} aria-label="Your stats">
    <div className={styles.youZero}>
      <div className={styles.youZeroTitle}>You haven't earned any XP yet.</div>
      <div className={styles.youZeroBody}>
        {boardFull
          ? "Post in eligible channels to start climbing toward the Top 10."
          : "Post in eligible channels to join the leaderboard."}
      </div>
    </div>
  </section>
);

// --- Shared pieces ----------------------------------------------------------

const ProgressBar: React.FC<{ stats: GetMyStatsResponse }> = ({ stats }) => {
  const pct = progressPercent(stats.progressToNextLevel);
  return (
    <div className={styles.progressWrapper}>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${pct.toFixed(0)}% to Level ${stats.level + 1}`}
      >
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

function progressPercent(fractional: number): number {
  return Math.max(0, Math.min(100, fractional * 100));
}

const AwardRow: React.FC<{ award: AwardEntry }> = ({ award }) => {
  // Proto int64 → bigint. Widen to number for formatting; ms-epoch timestamps
  // are safely well under 2^53.
  const ts = Number(award.timestamp);
  return (
    <li className={styles.award} title={formatAbsolute(ts)}>
      <span className={styles.awardChannel}>#{award.channelName}</span>
      <span className={styles.awardTime}>{formatRelativeTime(ts)}</span>
      <span className={styles.awardAmount}>+{award.amount} XP</span>
    </li>
  );
};
