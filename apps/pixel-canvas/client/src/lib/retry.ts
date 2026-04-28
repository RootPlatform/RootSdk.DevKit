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
// Idempotency: most RPCs in this sample are idempotent — GetCanvas /
// GetSettings / ReportClientError trivially so (no side effects), and
// UpdateSettings / ClearCanvas converge to the same target state on
// repeat application. PlacePixel is the lone exception: its cooldown
// side effect means a retry-after-lost-response would hit
// COOLDOWN_NOT_ELAPSED for a placement that already landed.
//
// Defense: PlacePixel deliberately calls the service client DIRECTLY
// (no withClientRetry — see HomeView's handlePlace). On a transient
// network error the user retries manually. The PixelPlaced broadcast
// is the active recovery path: it still delivers the placedAt to all
// clients including the placer, so CanvasContext updates own-cooldown
// state even when the direct response was lost. Agents adding new
// non-idempotent RPCs should follow that pattern (skip the wrapper)
// or add an idempotency token to the request.
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
