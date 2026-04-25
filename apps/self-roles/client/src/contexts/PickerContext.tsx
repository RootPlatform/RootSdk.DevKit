import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  rolePickerServiceClient,
  RolePickerServiceClientEvent,
} from "@selfroles/gen-client";
import type {
  PickerGroup,
  PickerLimits,
  PickerConfigChangedEvent,
} from "@selfroles/gen-shared";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// PickerContext — picker config + caller's amIAdmin + caller's currently held
// role IDs. Fed by GetPicker on mount, kept live by the PickerConfigChanged
// and AdminsChanged broadcasts.
//
// Why a single context (vs splitting into PickerConfigContext +
// MyRolesContext): both surfaces re-render on the same triggers in practice
// (config change → both views update; admin role pick affects amIAdmin which
// gates the gear icon). Splitting would buy nothing and force consumers
// to subscribe to both anyway.
//
// myRoleIds is a Set for O(1) "do I have this role?" checks at toggle time.
// ============================================================================

export interface PickerState {
  groups: PickerGroup[];
  myRoleIds: Set<string>;
  amIAdmin: boolean;
  limits: PickerLimits | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => Promise<void>;
  // Optimistically replace local myRoleIds — used by HomeView after a
  // successful ToggleRole RPC so the UI doesn't wait for a broadcast or
  // refetch to reflect the change.
  setMyRoleIds: (ids: string[]) => void;
}

const PickerCtx = createContext<PickerState | undefined>(undefined);

export const PickerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [groups, setGroups] = useState<PickerGroup[]>([]);
  const [myRoleIds, setMyRoleIdsState] = useState<Set<string>>(new Set());
  const [amIAdmin, setAmIAdmin] = useState(false);
  const [limits, setLimits] = useState<PickerLimits | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await withClientRetry(() =>
        rolePickerServiceClient.getPicker({}),
      );
      setGroups(response.groups);
      setMyRoleIdsState(new Set(response.myRoleIds));
      setAmIAdmin(response.amIAdmin);
      setLimits(response.limits);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Live-update the picker config when the server broadcasts a change.
  // Doesn't touch myRoleIds — those only change via the caller's own
  // ToggleRole responses (which call setMyRoleIds directly).
  useEffect(() => {
    const onConfig = (event: PickerConfigChangedEvent) => {
      setGroups(event.groups);
    };
    rolePickerServiceClient.on(
      RolePickerServiceClientEvent.PickerConfigChanged,
      onConfig,
    );
    return () => {
      rolePickerServiceClient.off(
        RolePickerServiceClientEvent.PickerConfigChanged,
        onConfig,
      );
    };
  }, []);

  // Refresh when globalSettings admins change (mirrors leveling-leaderboard).
  useEffect(() => {
    const onAdmins = () => {
      void reload();
    };
    rolePickerServiceClient.on(
      RolePickerServiceClientEvent.AdminsChanged,
      onAdmins,
    );
    return () => {
      rolePickerServiceClient.off(
        RolePickerServiceClientEvent.AdminsChanged,
        onAdmins,
      );
    };
  }, [reload]);

  const setMyRoleIds = useCallback((ids: string[]) => {
    setMyRoleIdsState(new Set(ids));
  }, []);

  const value: PickerState = {
    groups,
    myRoleIds,
    amIAdmin,
    limits,
    loading,
    error,
    reload,
    setMyRoleIds,
  };
  return <PickerCtx.Provider value={value}>{children}</PickerCtx.Provider>;
};

export function usePicker(): PickerState {
  const v = useContext(PickerCtx);
  if (!v) throw new Error("usePicker must be used inside <PickerProvider>");
  return v;
}
