import React from "react";
import styles from "./HomeView.module.css";
import { useFeed } from "../contexts/FeedContext";
import { ReleaseCard } from "../components/ReleaseCard";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { EmptyState } from "../components/EmptyState";
import { formatRelativeTime } from "../lib/relativeTime";

// ============================================================================
// HomeView — the public release feed.
//
// Layout (DESIGN.md → Release feed):
//   * Status line: "Watching {N} repos · {relative}" — or "Watching {N}
//     repos" when no successful poll has happened yet. The timestamp is
//     a liveness indicator (most recent successful poll across any repo).
//   * Card list: most-recent ~50 releases across all watched repos.
//
// View states:
//   * Loading           → <Loader />
//   * Error             → <QueryError onRetry />
//   * No repos          → <EmptyState> (admin sees a different body than non-admins)
//   * Repos, no feed    → <EmptyState> "No releases yet"
//   * Otherwise         → status line + card list
// ============================================================================

export const HomeView: React.FC = () => {
  const {
    releases,
    newReleaseIds,
    mostRecentSuccessfulPollAt,
    watchedRepoCount,
    amIAdmin,
    loading,
    error,
    reload,
  } = useFeed();

  if (loading) return <Loader />;
  if (error) return <QueryError onRetry={reload} message={error.message} />;

  // Render priority: releases > count. If there are cards in the feed,
  // render them unconditionally — even when `watchedRepoCount` is briefly
  // stale. This is defense in depth; in normal operation the count and
  // the cards stay aligned via RepoAdded / ReleaseAdded broadcasts.
  if (releases.length > 0) {
    return (
      <div className={styles.column}>
        <StatusLine
          watchedRepoCount={watchedRepoCount}
          mostRecentSuccessfulPollAt={mostRecentSuccessfulPollAt}
        />
        <div className={styles.feed}>
          {releases.map((release) => (
            <ReleaseCard
              // Composite key: a release id is unique within (owner, name)
              // but not globally — two unrelated repos could in principle
              // share an id from GitHub's pool. Compose for safety. Same
              // composite shape as `newReleaseIds` keys for symmetry.
              key={`${release.owner}/${release.name}/${release.id}`}
              release={release}
              isNew={newReleaseIds.has(`${release.owner}/${release.name}/${release.id}`)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (watchedRepoCount === 0) {
    return (
      <div className={styles.column}>
        <EmptyState
          title="No repositories yet"
          body={
            amIAdmin
              ? "Add a repository in Settings to start tracking releases."
              : "An admin hasn't added any repositories yet."
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.column}>
      <StatusLine
        watchedRepoCount={watchedRepoCount}
        mostRecentSuccessfulPollAt={mostRecentSuccessfulPollAt}
      />
      <EmptyState
        title="No releases yet"
        body="Releases from your watched repositories will appear here."
      />
    </div>
  );
};

interface StatusLineProps {
  watchedRepoCount: number;
  mostRecentSuccessfulPollAt: number;
}

const StatusLine: React.FC<StatusLineProps> = ({
  watchedRepoCount,
  mostRecentSuccessfulPollAt,
}) => {
  const repoLabel =
    watchedRepoCount === 1 ? "1 repo" : `${watchedRepoCount} repos`;
  const ts = mostRecentSuccessfulPollAt;
  return (
    <div className={styles.status}>
      Watching {repoLabel}
      {ts > 0 && <> · {formatRelativeTime(ts)}</>}
    </div>
  );
};
