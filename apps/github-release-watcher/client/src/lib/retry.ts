import { RootServerException } from "@rootsdk/client-app";

// ============================================================================
// withClientRetry — retries transient failures on client-side RPC calls.
// Mirrors server/src/lib/retry.ts in spirit: short exponential backoff with
// jitter, retry transient errors only.
//
// Classification:
//   - RootServerException with positive code → domain error (NOT_ADMIN,
//     INVALID_URL, REPO_NOT_FOUND, etc.). Don't retry; surface to the user.
//   - RootServerException with negative code → built-in error like
//     RateLimitExceeded, RequestTimeout. Retry.
//   - Other errors (network disconnects, aborted fetches) → retry.
//
// Idempotency: every read RPC in this sample is idempotent. AddRepo and
// RemoveRepo are NOT idempotent in their effects, but they're also not
// wrapped here — settings mutations are routed through useDebouncedMutation,
// which has its own retry control via the AutoSaveStatus pill. Use this
// wrapper only on read RPCs (GetFeed, GetSettings) and broadcast-driven
// refresh paths.
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;   // Default 2 (so 3 total attempts)
  baseDelayMs?: number;  // Default 500
  maxDelayMs?: number;   // Default 5000
}

function isRetryable(err: unknown): boolean {
  if (err instanceof RootServerException) {
    // Negative codes are built-in transient types (rate limit, timeout, etc.).
    // Positive codes are app-defined domain errors — not retryable.
    return err.code < 0;
  }
  // Network/disconnect errors — retry.
  return true;
}

export async function withClientRetry<T>(
  op: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 5000;

  for (let attempt = 0; ; attempt++) {
    try {
      return await op();
    } catch (err) {
      if (attempt >= maxRetries || !isRetryable(err)) {
        throw err;
      }
      // Bounded jitter: floor at baseDelayMs, ceiling at the exponential
      // cap. `Math.random() * capped` — full jitter — can produce a
      // near-zero delay on the first retry, hammering the server we just
      // got a transient failure from. Bounding the floor guarantees a
      // real minimum wait while still spreading retries across
      // [base, capped). Same shape as server/src/lib/retry.ts and
      // server/src/githubClient.ts — kept consistent across the codebase
      // so forks copying any one of them get the right pattern.
      const exponential = baseDelayMs * 2 ** attempt;
      const capped = Math.min(exponential, maxDelayMs);
      const jittered = baseDelayMs + Math.random() * (capped - baseDelayMs);
      await new Promise((r) => setTimeout(r, jittered));
    }
  }
}
