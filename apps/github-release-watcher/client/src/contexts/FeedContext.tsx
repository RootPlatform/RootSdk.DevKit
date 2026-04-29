import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  releaseWatcherServiceClient,
  ReleaseWatcherServiceClientEvent,
} from "@githubreleasewatcher/gen-client";
import type {
  Release,
  ReleaseAddedEvent,
  RepoAddedEvent,
  RepoRemovedEvent,
} from "@githubreleasewatcher/gen-shared";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// FeedContext — release feed + amIAdmin + home view header info, fed by
// GetFeed RPC and four broadcasts: ReleaseAdded, RepoAdded, RepoRemoved,
// AdminsChanged. See DESIGN.md → State.
//
// Two new-card live-update concerns:
//   * `newReleaseIds` carries composite `${owner}/${name}/${id}` keys that
//     just arrived via ReleaseAdded so ReleaseCard can mount with the
//     highlight pulse. Cleared after a tick so a re-render doesn't replay
//     the pulse.
//   * RepoRemoved filters cards for that repo out of local state immediately
//     — no GetFeed round-trip needed.
//
// Cap: client-side mirror of the server's archive cap (50). Not strictly
// needed since the server already prunes, but a defensive trim ensures we
// never render more than the cap if a future bug let the server send more.
// ============================================================================

const FEED_CAP = 50;

export interface FeedState {
  releases: Release[];
  amIAdmin: boolean;
  // Set of release identifiers that arrived via ReleaseAdded since the
  // last render tick. Drives ReleaseCard's mount-time highlight pulse
  // (`isNew` prop). Keyed `${owner}/${name}/${id}` for symmetry with the
  // composite render key in HomeView — GitHub release ids are global and
  // monotonic in practice, so a bare-id key would work, but the composite
  // key matches the rest of the codebase's "(owner, name, id) is the
  // identity tuple" stance and keeps an integration with a different
  // upstream (where ids might collide across projects) safe by default.
  newReleaseIds: Set<string>;
  // Most recent successful poll across any repo, in unix ms. 0 when no
  // poll has succeeded yet — the home view header drops the timestamp.
  mostRecentSuccessfulPollAt: number;
  watchedRepoCount: number;

  loading: boolean;
  error: Error | undefined;
  reload: () => Promise<void>;
}

const FeedCtx = createContext<FeedState | undefined>(undefined);

export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [amIAdmin, setAmIAdmin] = useState(false);
  const [newReleaseIds, setNewReleaseIds] = useState<Set<string>>(new Set());
  const [mostRecentSuccessfulPollAt, setMostRecentSuccessfulPollAt] = useState(0);
  const [watchedRepoCount, setWatchedRepoCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Reload-vs-broadcast race buffer. An AdminsChanged refresh that lands
  // while a reload is in flight gets deferred so its setAmIAdmin doesn't
  // get clobbered by the reload's (stale-at-fetch-time) value. Same shape
  // applied to soft-reload-vs-soft-reload: two AdminsChanged events firing
  // close together would otherwise let two soft reloads race, with last-
  // RPC-completion-wins on every setter. Symmetry between the two refs
  // keeps the policy uniform.
  const inFlightReloadRef = useRef(false);
  const inFlightSoftReloadRef = useRef(false);
  const pendingSoftReloadRef = useRef(false);

  // Soft reload — re-fetches the entire feed payload but doesn't toggle
  // `loading` or surface errors to the UI. Same RPC and same setters as
  // the full `reload`; the "soft" qualifier is purely about visible UX
  // (no loader, no error boundary). Used by the AdminsChanged broadcast
  // path: when admins change, every client needs its `am_i_admin` flag
  // updated, but a transient loader on the home view would be jarring.
  //
  // We don't have a dedicated GetAmIAdmin RPC in this app — the GetFeed
  // payload is small (≤50 releases + a few scalars), so a full re-fetch
  // is acceptable for a low-frequency event. If the feed payload ever
  // grows substantially, the right move is to split out a GetAmIAdmin
  // RPC and call THAT here, leaving feed state untouched.
  const softReloadFeed = useCallback(async () => {
    // If a soft reload is already in flight, queue a follow-up. Two
    // concurrent soft reloads would race on the same setters with no
    // ordering guarantee; queueing means the second AdminsChanged event
    // lands AFTER the first completes (and therefore on top of state
    // that's at-most-one-fetch stale instead of indeterminately stale).
    if (inFlightSoftReloadRef.current) {
      pendingSoftReloadRef.current = true;
      return;
    }
    inFlightSoftReloadRef.current = true;
    try {
      const r = await withClientRetry(() =>
        releaseWatcherServiceClient.getFeed({}),
      );
      setAmIAdmin(r.amIAdmin);
      setReleases(r.releases);
      setMostRecentSuccessfulPollAt(Number(r.mostRecentSuccessfulPollAt));
      setWatchedRepoCount(r.watchedRepoCount);
    } catch (err) {
      console.warn("[FeedContext] soft reload getFeed failed:", err);
    } finally {
      inFlightSoftReloadRef.current = false;
      // Drain any queued soft reload that landed during this one. Don't
      // chase forever — the queue is single-slot, so at most one follow-up.
      if (pendingSoftReloadRef.current) {
        pendingSoftReloadRef.current = false;
        void softReloadFeed();
      }
    }
  }, []);

  const reload = useCallback(async () => {
    inFlightReloadRef.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const response = await withClientRetry(() =>
        releaseWatcherServiceClient.getFeed({}),
      );
      setReleases(response.releases);
      setAmIAdmin(response.amIAdmin);
      setMostRecentSuccessfulPollAt(Number(response.mostRecentSuccessfulPollAt));
      setWatchedRepoCount(response.watchedRepoCount);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      inFlightReloadRef.current = false;
      if (pendingSoftReloadRef.current) {
        pendingSoftReloadRef.current = false;
        void softReloadFeed();
      }
    }
  }, [softReloadFeed]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ReleaseAdded — prepend the new release, mark its id as "new" for the
  // mount-time pulse, advance the last-successful-poll timestamp.
  useEffect(() => {
    const onReleaseAdded = (event: ReleaseAddedEvent) => {
      if (!event.release) return;
      const release = event.release;
      setReleases((prev) => {
        // Defensive dedupe — the server already filters by id but a race
        // between an in-flight GetFeed reload and a broadcast could
        // momentarily double-list a release. Drop any prior entry with the
        // same (owner, name, id) before prepending.
        const filtered = prev.filter(
          (r) =>
            !(
              r.owner === release.owner &&
              r.name === release.name &&
              r.id === release.id
            ),
        );
        return [release, ...filtered].slice(0, FEED_CAP);
      });
      const key = `${release.owner}/${release.name}/${release.id}`;
      setNewReleaseIds((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setMostRecentSuccessfulPollAt((prev) =>
        Math.max(prev, Number(release.addedAt)),
      );
      // Drop the "new" marker after the highlight pulse runs (350ms +
      // headroom). A subsequent re-render of the same card mustn't replay
      // the pulse — see ReleaseCard's `isNew` handling.
      setTimeout(() => {
        setNewReleaseIds((prev) => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 500);
    };

    releaseWatcherServiceClient.on(
      ReleaseWatcherServiceClientEvent.ReleaseAdded,
      onReleaseAdded,
    );
    return () => {
      releaseWatcherServiceClient.off(
        ReleaseWatcherServiceClientEvent.ReleaseAdded,
        onReleaseAdded,
      );
    };
  }, []);

  // RepoAdded — public count-bump signal. Increments watchedRepoCount so
  // the home view leaves the "No repositories yet" empty state without
  // waiting for the first ReleaseAdded broadcast (which may be ~1 minute
  // away, or never if the repo's first poll fails). Doesn't carry any
  // release data — per-row state is admin-only via RepoListChanged.
  useEffect(() => {
    const onRepoAdded = (_event: RepoAddedEvent) => {
      setWatchedRepoCount((prev) => prev + 1);
    };
    releaseWatcherServiceClient.on(
      ReleaseWatcherServiceClientEvent.RepoAdded,
      onRepoAdded,
    );
    return () => {
      releaseWatcherServiceClient.off(
        ReleaseWatcherServiceClientEvent.RepoAdded,
        onRepoAdded,
      );
    };
  }, []);

  // RepoRemoved — drop cards for the removed repo + decrement count. No
  // GetFeed round-trip; the server's RepoRemoved broadcast arrives with
  // just {owner, name} and we filter local state.
  useEffect(() => {
    const onRepoRemoved = (event: RepoRemovedEvent) => {
      setReleases((prev) =>
        prev.filter(
          (r) => !(r.owner === event.owner && r.name === event.name),
        ),
      );
      setWatchedRepoCount((prev) => Math.max(0, prev - 1));
    };
    releaseWatcherServiceClient.on(
      ReleaseWatcherServiceClientEvent.RepoRemoved,
      onRepoRemoved,
    );
    return () => {
      releaseWatcherServiceClient.off(
        ReleaseWatcherServiceClientEvent.RepoRemoved,
        onRepoRemoved,
      );
    };
  }, []);

  // AdminsChanged — refresh state. Defers if a reload is in flight so the
  // refresh's setAmIAdmin lands AFTER the reload's (stale-at-fetch-time).
  useEffect(() => {
    const onAdminsChanged = () => {
      if (inFlightReloadRef.current) {
        pendingSoftReloadRef.current = true;
        return;
      }
      void softReloadFeed();
    };
    releaseWatcherServiceClient.on(
      ReleaseWatcherServiceClientEvent.AdminsChanged,
      onAdminsChanged,
    );
    return () => {
      releaseWatcherServiceClient.off(
        ReleaseWatcherServiceClientEvent.AdminsChanged,
        onAdminsChanged,
      );
    };
  }, [softReloadFeed]);

  const value: FeedState = {
    releases,
    amIAdmin,
    newReleaseIds,
    mostRecentSuccessfulPollAt,
    watchedRepoCount,
    loading,
    error,
    reload,
  };
  return <FeedCtx.Provider value={value}>{children}</FeedCtx.Provider>;
};

export function useFeed(): FeedState {
  const v = useContext(FeedCtx);
  if (!v) throw new Error("useFeed must be used inside <FeedProvider>");
  return v;
}
