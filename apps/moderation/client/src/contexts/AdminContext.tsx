import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  moderationServiceClient,
  ModerationServiceClientEvent,
} from "@moderation/gen-client";
import { withClientRetry } from "../lib/retry";

// AdminContext — single source of truth for the caller's amIAdmin flag.
// Re-fetches on AdminsChanged broadcasts. Pages that already fetched the
// flag inline (e.g. the dashboard's GetDashboard response) are responsible
// for keeping it consistent with this context's value if they care.

interface AdminContextValue {
  amIAdmin: boolean;
  loading: boolean;
}

const Ctx = createContext<AdminContextValue>({ amIAdmin: false, loading: true });

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [amIAdmin, setAmIAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const r = await withClientRetry(() =>
        moderationServiceClient.getAmIAdmin({}),
      );
      setAmIAdmin(r.amIAdmin);
    } catch (err) {
      console.warn("[AdminContext] getAmIAdmin failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const onChanged = () => {
      void refresh();
    };
    moderationServiceClient.on(
      ModerationServiceClientEvent.AdminsChanged,
      onChanged,
    );
    return () => {
      moderationServiceClient.off(
        ModerationServiceClientEvent.AdminsChanged,
        onChanged,
      );
    };
  }, []);

  return (
    <Ctx.Provider value={{ amIAdmin, loading }}>{children}</Ctx.Provider>
  );
};

export function useAdmin(): AdminContextValue {
  return useContext(Ctx);
}
