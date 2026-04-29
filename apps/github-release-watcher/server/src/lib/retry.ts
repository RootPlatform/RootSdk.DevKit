import { RootApiException, ErrorCodeType } from "@rootsdk/server-app";
import { log, errFields } from "./log";

// ============================================================================
// withRetry — retry transient SDK failures with exponential backoff + jitter.
// Canonical pattern from api-samples/server-resilience.
//
// Retryable: TooManyRequests, ServerError, Timeout, StillProcessing.
// Non-retryable: NoPermission*, NotFound, RequestValidationFailed, etc.
// Non-RootApiException errors (network hiccups) are treated as retryable.
//
// This wraps SDK calls. For outbound HTTP retry semantics (status codes,
// network errors), see githubClient.ts — different error shapes need a
// separate helper.
// ============================================================================

const RETRYABLE_ERROR_CODES = new Set([
  ErrorCodeType.TooManyRequests,
  ErrorCodeType.ServerError,
  ErrorCodeType.Timeout,
  ErrorCodeType.StillProcessing,
]);

function isRetryable(err: unknown): boolean {
  if (err instanceof RootApiException) {
    return RETRYABLE_ERROR_CODES.has(err.errorCode);
  }
  return true;
}

export interface RetryOptions {
  maxRetries?: number;   // Default 3 → 4 total attempts
  baseDelayMs?: number;  // Default 1000
  maxDelayMs?: number;   // Default 15000
}

export async function withRetry<T>(
  label: string,
  operation: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 15000;

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      if (attempt >= maxRetries || !isRetryable(err)) {
        log("error", `[${label}] failed after ${attempt + 1} attempt(s)`, {
          errorCode:
            err instanceof RootApiException ? ErrorCodeType[err.errorCode] : undefined,
          ...errFields(err),
        });
        throw err;
      }
      // Bounded jitter: floor at baseDelayMs, ceiling at the exponential
      // cap. `Math.random() * capped` — full jitter — can produce a near-
      // zero delay on the first retry, which barely waits at all and
      // hammers the same dependency that just failed; bounding the floor
      // at `baseDelayMs` guarantees a real minimum wait while still
      // spreading thundering-herd retries across the [base, capped) range.
      const exponential = baseDelayMs * 2 ** attempt;
      const capped = Math.min(exponential, maxDelayMs);
      const jittered = baseDelayMs + Math.random() * (capped - baseDelayMs);
      log("warn", `[${label}] retry ${attempt + 1}/${maxRetries}`, {
        errorCode:
          err instanceof RootApiException ? ErrorCodeType[err.errorCode] : undefined,
        delayMs: Math.round(jittered),
      });
      await new Promise((r) => setTimeout(r, jittered));
    }
  }
}
