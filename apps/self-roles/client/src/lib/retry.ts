import { RootServerException } from "@rootsdk/client-app";

// ============================================================================
// withClientRetry — retries transient failures on client-side RPC calls.
// Mirrors server/src/lib/retry.ts in spirit: short exponential backoff with
// jitter, retry transient errors only.
//
// Classification:
//   - RootServerException with positive code → domain error (NOT_ADMIN,
//     INVALID_SETTINGS, etc.). Don't retry; surface to the user.
//   - RootServerException with negative code → built-in error like
//     RateLimitExceeded, RequestTimeout. Retry.
//   - Other errors (network disconnects, aborted fetches) → retry.
//
// Idempotency: every RPC in this sample is idempotent by design, so retry
// under "request sent but response lost" races is safe (duplicate requests
// have no extra effect). Agents building non-idempotent RPCs should either
// not use this wrapper or add an idempotency token to the request.
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
      const exponential = baseDelayMs * 2 ** attempt;
      const capped = Math.min(exponential, maxDelayMs);
      const jittered = Math.random() * capped;
      await new Promise((r) => setTimeout(r, jittered));
    }
  }
}
