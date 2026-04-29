// ============================================================================
// Client-side mirrors of server domain constants (server/src/limits.ts).
//
// The server is the authoritative enforcement boundary — these constants
// drive UX (input bounds, copy, hint text) so the user doesn't get a
// rejection on every keystroke for a mid-typing value, but they don't
// gate writes. A stale or hostile client that bypasses these limits
// still hits the server's RootServerException(INTERVAL_TOO_LOW /
// MAX_REPOS_REACHED) on the RPC.
//
// Keep in sync with server/src/limits.ts. Drift is harmless in spirit
// (UX vs enforcement layers) but confusing to readers.
// ============================================================================

export const MAX_REPOS = 10;
export const INTERVAL_FLOOR_MINUTES = 15;
export const INTERVAL_CEILING_MINUTES = 24 * 60; // 1 day — sane upper bound for a NumberInput
export const DEFAULT_INTERVAL_MINUTES = 30;
