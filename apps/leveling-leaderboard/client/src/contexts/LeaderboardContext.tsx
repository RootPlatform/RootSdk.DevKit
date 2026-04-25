import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  leaderboardServiceClient,
  LeaderboardServiceClientEvent,
} from "@levelingleaderboard/gen-client";
import type {
  LeaderboardEntry as ProtoLeaderboardEntry,
  LeaderboardUpdatedEvent,
} from "@levelingleaderboard/gen-shared";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// LeaderboardContext — top-10 snapshot + amIAdmin, fed by GetLeaderboard RPC
// and the LeaderboardUpdated broadcast. See DESIGN.md State. Known limit on
// reconnect handling is documented in README.md "Known limits".
// ============================================================================

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  level: number;
  totalXp: number;
}

export interface LeaderboardState {
  entries: LeaderboardEntry[];
  amIAdmin: boolean;
  loading: boolean;
  error: Error | undefined;
  // Incremented whenever a LeaderboardUpdated with allReset=true arrives.
  // MyStats depends on this to trigger a refetch.
  resetToken: number;
  reload: () => Promise<void>;
}

const LeaderboardCtx = createContext<LeaderboardState | undefined>(undefined);

function toEntry(e: ProtoLeaderboardEntry): LeaderboardEntry {
  return { userId: e.userId, rank: e.rank, level: e.level, totalXp: e.totalXp };
}

export const LeaderboardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [amIAdmin, setAmIAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [resetToken, setResetToken] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await withClientRetry(() =>
        leaderboardServiceClient.getLeaderboard({}),
      );
      setEntries(response.entries.map(toEntry));
      setAmIAdmin(response.amIAdmin);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onUpdated = (event: LeaderboardUpdatedEvent) => {
      setEntries(event.entries.map(toEntry));
      if (event.allReset) {
        setResetToken((v) => v + 1);
      }
    };
    leaderboardServiceClient.on(
      LeaderboardServiceClientEvent.LeaderboardUpdated,
      onUpdated,
    );
    return () => {
      leaderboardServiceClient.off(
        LeaderboardServiceClientEvent.LeaderboardUpdated,
        onUpdated,
      );
    };
  }, []);

  // Refresh amIAdmin when globalSettings admins change. The server fires a
  // public (empty) AdminsChanged event whenever the global admin list shifts;
  // we can't compute the new amIAdmin locally (admins live in globalSettings,
  // which the client doesn't read directly), so we re-fetch GetLeaderboard
  // to pick up the authoritative flag.
  //
  // Why a separate event instead of a flag on SettingsUpdated: SettingsUpdated
  // is admin-only (its payload carries user/role IDs from the XP-eligible
  // picker), so a demoted admin wouldn't receive it. AdminsChanged is public
  // and payload-free, which is the minimum needed to nudge every client into
  // refetching.
  //
  // Without this, the gear icon and admin-only controls would stay visible
  // to a user who was just demoted — the server rejects their mutations,
  // but the UI wouldn't reflect their lost permissions until manual refresh.
  useEffect(() => {
    const onAdminsChanged = () => {
      void reload();
    };
    leaderboardServiceClient.on(
      LeaderboardServiceClientEvent.AdminsChanged,
      onAdminsChanged,
    );
    return () => {
      leaderboardServiceClient.off(
        LeaderboardServiceClientEvent.AdminsChanged,
        onAdminsChanged,
      );
    };
  }, [reload]);

  const value: LeaderboardState = {
    entries,
    amIAdmin,
    loading,
    error,
    resetToken,
    reload,
  };
  return <LeaderboardCtx.Provider value={value}>{children}</LeaderboardCtx.Provider>;
};

export function useLeaderboard(): LeaderboardState {
  const v = useContext(LeaderboardCtx);
  if (!v) throw new Error("useLeaderboard must be used inside <LeaderboardProvider>");
  return v;
}
