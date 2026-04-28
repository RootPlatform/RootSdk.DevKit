import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

  // Track in-flight reload + buffered AdminsChanged refresh. The pair
  // closes a race where the lightweight refetchAmIAdmin response could
  // land BEFORE an in-flight reload's snapshot, then get clobbered when
  // the snapshot's setAmIAdmin (with stale-at-fetch-time state) lands
  // on top. Buffering defers the refresh until after the reload's
  // finally fires; the refresh's setAmIAdmin then has the final word.
  const inFlightReloadRef = useRef(false);
  const pendingAdminsRefetchRef = useRef(false);

  // Lightweight per-caller admin refresh. Fired on every AdminsChanged
  // broadcast — the only thing that needs to change is the amIAdmin
  // boolean, so we send a 1-byte response over the wire instead of
  // refetching the entire leaderboard. See proto GetAmIAdminRequest
  // for the wire-efficiency rationale.
  //
  // Failure handling mirrors the silent-refresh convention: log and
  // keep current amIAdmin. The next AdminsChanged (or a manual reload)
  // will retry.
  const refetchAmIAdmin = useCallback(async () => {
    try {
      const r = await withClientRetry(() =>
        leaderboardServiceClient.getAmIAdmin({}),
      );
      setAmIAdmin(r.amIAdmin);
    } catch (err) {
      console.warn("[LeaderboardContext] getAmIAdmin failed:", err);
    }
  }, []);

  const reload = useCallback(async () => {
    inFlightReloadRef.current = true;
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
      inFlightReloadRef.current = false;
      // If AdminsChanged fired during the in-flight window, fire the
      // deferred refresh now so its setAmIAdmin lands AFTER the
      // snapshot's. Single fire regardless of how many flaps queued
      // up — the latest server state is the answer either way.
      if (pendingAdminsRefetchRef.current) {
        pendingAdminsRefetchRef.current = false;
        void refetchAmIAdmin();
      }
    }
  }, [refetchAmIAdmin]);

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

  // Refresh amIAdmin when globalSettings admins change. The server
  // fires a public (empty) AdminsChanged event whenever the global
  // admin list shifts; we can't compute the new amIAdmin locally
  // (admins live in globalSettings, which the client doesn't read
  // directly), so we fire a lightweight GetAmIAdmin RPC to pick up
  // the authoritative flag. Refetching the full leaderboard would
  // cross the wire with the entire top-N just to flip one boolean —
  // see proto comment for the wire-efficiency rationale.
  //
  // Why a separate event instead of a flag on SettingsUpdated:
  // SettingsUpdated is admin-only (its payload carries user/role
  // IDs from the XP-eligible picker), so a demoted admin wouldn't
  // receive it. AdminsChanged is public and payload-free, which is
  // the minimum needed to nudge every client into refreshing.
  //
  // Without this, the gear icon and admin-only controls would stay
  // visible to a user who was just demoted — the server rejects
  // their mutations, but the UI wouldn't reflect their lost
  // permissions until manual refresh.
  //
  // The in-flight check defers the refresh until after a racing
  // reload's snapshot has applied; without it, the lightweight
  // response could land first and then get clobbered by the
  // snapshot's stale-at-fetch-time amIAdmin.
  useEffect(() => {
    const onAdminsChanged = () => {
      if (inFlightReloadRef.current) {
        pendingAdminsRefetchRef.current = true;
        return;
      }
      void refetchAmIAdmin();
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
  }, [refetchAmIAdmin]);

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
