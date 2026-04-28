// ============================================================================
// log — structured JSON logging for server-side code.
//
// One JSON object per line. Consumable by any log aggregator. Prefer this
// over ad-hoc console.log/console.error so log entries carry structured
// context (errorCode, userId, etc.) rather than free-form strings.
//
// Copy verbatim across DevKit samples — same shape in leveling-leaderboard
// and self-roles. Forks should keep the helper unchanged and add their own
// per-domain context fields at the call sites.
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

// Normalize an unknown error into log-friendly fields. Always use this in
// structured error logs — stack traces are the single most useful field
// when debugging production issues.
export function errFields(err: unknown): { error: string; stack?: string } {
  if (err instanceof Error) {
    return { error: err.message, stack: err.stack };
  }
  return { error: String(err) };
}
