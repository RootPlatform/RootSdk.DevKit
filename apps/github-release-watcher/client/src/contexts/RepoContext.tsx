import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  releaseWatcherServiceClient,
  ReleaseWatcherServiceClientEvent,
} from "@githubreleasewatcher/gen-client";
import type {
  Repo,
  RepoListChangedEvent,
} from "@githubreleasewatcher/gen-shared";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// RepoContext — admin-only watched-repos list, fed by GetSettings RPC + the
// admin-only RepoListChanged broadcast.
//
// Lifecycle:
//   * Mount: fetch GetSettings.
//   * RepoListChanged broadcast: replace local state with the snapshot.
//     The server fires this on every Add / Update / Remove, so our own
//     mutations also flow back through here without optimistic updates.
//   * Unmount: SDK subscription cleanup.
//
// The broadcast reaches every member of the server-side `adminAudience`
// MemberGroup, which mirrors `globalSettings.general.admins ∪ ownerUserId`
// (see server/src/adminAudience.ts). That includes the community owner
// even when they aren't explicitly in the admins setting, so the owner's
// Settings view stays in sync after their own mutations.
// ============================================================================

export interface RepoState {
  repos: Repo[];
  loading: boolean;
  error: Error | undefined;
  reload: () => Promise<void>;
}

const RepoCtx = createContext<RepoState | undefined>(undefined);

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await withClientRetry(() =>
        releaseWatcherServiceClient.getSettings({}),
      );
      setRepos(response.repos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // RepoListChanged — admin-only broadcast carrying the full repo snapshot.
  useEffect(() => {
    const onRepoListChanged = (event: RepoListChangedEvent) => {
      setRepos(event.repos);
    };
    releaseWatcherServiceClient.on(
      ReleaseWatcherServiceClientEvent.RepoListChanged,
      onRepoListChanged,
    );
    return () => {
      releaseWatcherServiceClient.off(
        ReleaseWatcherServiceClientEvent.RepoListChanged,
        onRepoListChanged,
      );
    };
  }, []);

  const value: RepoState = { repos, loading, error, reload };
  return <RepoCtx.Provider value={value}>{children}</RepoCtx.Provider>;
};

export function useRepos(): RepoState {
  const v = useContext(RepoCtx);
  if (!v) throw new Error("useRepos must be used inside <RepoProvider>");
  return v;
}
