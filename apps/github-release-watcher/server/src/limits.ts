// ============================================================================
// limits — domain constants for github-release-watcher.
//
// These are deliberate product choices, not runtime knobs. Forks adapting
// the sample for a different external service should revisit these:
//
//   MAX_REPOS × (60 / INTERVAL_FLOOR_MINUTES) ≤ external_rate_limit_per_hour
//
// For GitHub's 60 req/hr unauthenticated ceiling: 10 × 4 = 40 req/hr,
// leaving 20 req/hr headroom for ad-hoc Preview-disclosure clicks, validate-on-save,
// and occasional retries. See DESIGN.md → Rate-limit constraints.
// ============================================================================

export const MAX_REPOS = 10;
export const INTERVAL_FLOOR_MINUTES = 15;
// Ceiling exists for defense in depth, not UX — the client's NumberInput
// already caps at this value, so legitimate users never hit it. Server-side
// enforcement matters only for hostile/buggy callers: without it, a scripted
// client could send Number.MAX_SAFE_INTEGER and the resulting `now + N * 60_000`
// arithmetic for the next-poll Date would saturate (Date overflows past
// 8.6e15 ms). Lesson generalizes — client bounds aren't enforcement.
export const INTERVAL_CEILING_MINUTES = 24 * 60;
export const DEFAULT_INTERVAL_MINUTES = 30;

// Caps on ReportClientError payloads. An ErrorBoundary fires once per crash
// so flooding is unlikely, but a client-side bug that loops calling report
// would otherwise log unbounded stack strings. Truncate at the handler.
export const ERROR_LABEL_CHARS = 100;
export const ERROR_MESSAGE_CHARS = 2000;
export const ERROR_STACK_CHARS = 8000;
export const ERROR_USER_AGENT_CHARS = 500;
