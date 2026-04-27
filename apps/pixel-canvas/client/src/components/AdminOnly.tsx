import React from "react";

// ============================================================================
// AdminOnly — conditional wrapper gated on a server-resolved admin flag.
//
// The flag is INJECTED via the `isAdmin` prop rather than read from a
// specific context, so this component is truly app-agnostic and can be
// copied verbatim into any Root sample. Apps wire it from their own state
// container (e.g., usePicker().amIAdmin in self-roles, useLeaderboard()
// .amIAdmin in leveling-leaderboard).
//
// Defence-in-depth wrapper: even if the calling shell has its own
// gear/route gate (which it should), AdminOnly ensures the wrapped UI
// disappears if the flag flips false mid-session.
// ============================================================================

interface Props {
  children: React.ReactNode;
  isAdmin: boolean;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<Props> = ({
  children,
  isAdmin,
  fallback = null,
}) => {
  if (!isAdmin) return <>{fallback}</>;
  return <>{children}</>;
};
