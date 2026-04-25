import React from "react";
import { useLeaderboard } from "../contexts/LeaderboardContext";

// ============================================================================
// AdminOnly — conditional wrapper gated on the server-provided amIAdmin flag.
//
// DESIGN.md Layout: the gear icon is hidden from non-admins and the app shell
// snaps a non-admin back to home if view === "settings" somehow, so AdminOnly
// should be unreachable through normal navigation. It exists as a defensive
// rendering guard.
// ============================================================================

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<Props> = ({ children, fallback = null }) => {
  const { amIAdmin } = useLeaderboard();
  if (!amIAdmin) return <>{fallback}</>;
  return <>{children}</>;
};
