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
  // Full reload with loader flash — flips loading=true so HomeView/Settings
  // show <Loader /> while the GetPicker round-trip is in flight. Right for
  // explicit user retries (QueryError onRetry) where the user expects
  // visible feedback that something's happening.
  reload: () => Promise<void>;
  // Background refresh — does NOT flip loading=true, so the existing UI
  // stays mounted and just updates in place when the response arrives.
  // Right for broadcast-driven refreshes where flashing the loader would
  // blink the page on every external state change. Used by the
  // AdminsChanged subscription. Errors are still captured to `error` so a
  // failed soft-reload surfaces on the next render.
  softReload: () => Promise<void>;
  // Replaces local myRoleIds from the server's authoritative response after
  // a ToggleRole RPC succeeds. NOT optimistic — we wait for the server's
  // resulting role list before updating, because exclusive groups may flip
  // multiple roles in a single RPC (sibling-removal + add) and predicting
  // that client-side would duplicate server logic. See HomeView.
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

  // Internal: shared fetch body. `withLoader` controls whether we flip the
  // `loading` state during the round-trip. Public reload uses true (visible
  // loader); softReload uses false (silent refresh).
  const fetchPicker = useCallback(async (withLoader: boolean) => {
    if (withLoader) setLoading(true);
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
      if (withLoader) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => fetchPicker(true), [fetchPicker]);
  const softReload = useCallback(() => fetchPicker(false), [fetchPicker]);

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

  // Refresh amIAdmin (and the rest of the picker payload) when
  // globalSettings admins change. softReload (vs reload) so the HomeView /
  // Settings don't flash <Loader /> on every admin reconfiguration — the
  // existing data is still valid; only amIAdmin might have flipped.
  useEffect(() => {
    const onAdmins = () => {
      void softReload();
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
  }, [softReload]);

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
    softReload,
    setMyRoleIds,
  };
  return <PickerCtx.Provider value={value}>{children}</PickerCtx.Provider>;
};

export function usePicker(): PickerState {
  const v = useContext(PickerCtx);
  if (!v) throw new Error("usePicker must be used inside <PickerProvider>");
  return v;
}
