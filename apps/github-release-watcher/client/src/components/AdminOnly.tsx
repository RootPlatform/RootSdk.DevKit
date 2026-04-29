import React from "react";
import { useFeed } from "../contexts/FeedContext";

// ============================================================================
// AdminOnly — conditional wrapper gated on the server-provided amIAdmin flag.
//
// DESIGN.md Layout: the gear icon is hidden from non-admins and the app
// shell snaps a non-admin back to home if view === "settings" somehow, so
// AdminOnly should be unreachable through normal navigation. It exists as
// a defensive rendering guard.
// ============================================================================

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<Props> = ({ children, fallback = null }) => {
  const { amIAdmin } = useFeed();
  if (!amIAdmin) return <>{fallback}</>;
  return <>{children}</>;
};
