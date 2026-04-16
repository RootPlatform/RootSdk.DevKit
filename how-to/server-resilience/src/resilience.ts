// ============================================================================
// How-To: Resilience — Retry & Backoff for Rate Limits
// SDK: RootApiException, ErrorCodeType (error classification)
// Pattern: withRetry() wrapper for any SDK call
// Retryable: TooManyRequests, ServerError, Timeout, StillProcessing
// Not retryable: NotFound, NoPermission*, RequestValidationFailed, etc.
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Any SDK call can fail with a transient error — rate limits, server hiccups,
// or request timeouts. This module provides a generic withRetry() wrapper that
// retries transient failures with exponential backoff and jitter.
//
// Copy withRetry(), isRetryable(), and RETRYABLE_ERROR_CODES into your bot.
// Wrap any SDK call: await withRetry(() => rootServer.community.channelMessages.create(...))
//
// Rate limits (server-enforced, approximate):
//   Commands (create/edit/delete):  ~5 req/s
//   Queries (get/list):             ~20 req/s
//   Profile updates:                ~3 per 5 min
//   Calls:                          ~1 req/s
//   Auth:                           ~2 req/s
//   Uploads:                        100 files or 250 MB/hr
//
// ============================================================================

import {
  rootServer,
  RootApiException,
  ErrorCodeType,
  MessageType,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessage,
  ChannelGuid,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeResilience(): void {
  const messages = rootServer.community.channelMessages;
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onResilienceCommand);
}

// --- RETRY HELPER ------------------------------------------------------------

// Error codes that are transient — the same request may succeed on retry.
// All other RootApiException codes (permissions, not-found, validation, etc.)
// are permanent failures and should NOT be retried.
const RETRYABLE_ERROR_CODES = new Set([
  ErrorCodeType.TooManyRequests,  // Rate limit — back off and retry
  ErrorCodeType.ServerError,      // Transient server issue
  ErrorCodeType.Timeout,          // Request timed out
  ErrorCodeType.StillProcessing,  // Server still working on prior request
]);

// Check whether an error is worth retrying.
// RootApiException with a non-retryable code → permanent failure, don't retry.
// RootApiException with a retryable code → retry.
// Non-RootApiException errors (network disconnects, DNS failures) → retry,
// because they are typically transient in a bot environment.
function isRetryable(err: unknown): boolean {
  if (err instanceof RootApiException) {
    return RETRYABLE_ERROR_CODES.has(err.errorCode);
  }
  return true;
}

interface RetryOptions {
  maxRetries?: number;   // Default: 3 (total attempts = maxRetries + 1)
  baseDelayMs?: number;  // Default: 1000ms — first retry waits 0–1s
  maxDelayMs?: number;   // Default: 15000ms — caps the exponential growth
}

// Wrap any async SDK call to automatically retry on transient errors.
//
// Uses exponential backoff with full jitter:
//   delay = random(0, min(baseDelayMs * 2^attempt, maxDelayMs))
//
// Full jitter (random between 0 and the computed cap) spreads retries more
// effectively than equal jitter when multiple bot instances hit the same
// rate limit simultaneously.
//
// Usage:
//   const msg = await withRetry(() =>
//     rootServer.community.channelMessages.create({ channelId, content })
//   );
//
// With custom options:
//   await withRetry(
//     () => rootServer.community.channelMessages.create({ channelId, content }),
//     { maxRetries: 5, baseDelayMs: 500 },
//   );
//
// NOTE: The delay uses setTimeout, which is fine for retry-scale waits (ms to
// seconds). For scheduled work (minutes, hours, recurring), use server-jobs
// instead — jobs survive restarts, setTimeout does not.
//
// TODO: RootApiException does not currently expose a retry-after delay from the
// server. If the platform adds this in the future, withRetry should prefer the
// server-provided delay over the computed backoff.
async function withRetry<T>(
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
        throw err;
      }

      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
      const jitteredDelay = Math.random() * cappedDelay;

      const errorInfo = err instanceof RootApiException
        ? ` (${ErrorCodeType[err.errorCode]})`
        : "";
      console.warn(
        `withRetry: attempt ${attempt + 1}/${maxRetries} failed${errorInfo}, ` +
        `retrying in ${Math.round(jitteredDelay)}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }
}

// --- BATCH PACING ------------------------------------------------------------

// When sending multiple commands in sequence (e.g., posting to several channels),
// insert a delay between each call to stay under the rate limit.
// Commands are limited to ~5 req/s, so a 250ms gap between calls keeps you
// comfortably below the threshold.
async function pace(delayMs: number = 250): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

// --- COMMAND HANDLER: /server-resilience --------------------------------------
// Demonstrates withRetry() for single calls and batch pacing for multiple calls.

async function onResilienceCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-resilience")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Single call with retry — the most common pattern.
    //    If the create hits a rate limit or transient error, withRetry
    //    handles backoff and retries up to 3 times before throwing.
    const msg: ChannelMessage = await withRetry(() =>
      messages.create({ channelId, content: "Step 1: single call with retry" }),
    );
    lines.push(`✓ single retry: sent message ${msg.id}`);

    // 2. Single call with custom retry options.
    //    Lower maxRetries for time-sensitive operations where you'd rather
    //    fail fast than wait through multiple backoff cycles.
    const msg2: ChannelMessage = await withRetry(
      () => messages.create({ channelId, content: "Step 2: custom retry options" }),
      { maxRetries: 1, baseDelayMs: 500 },
    );
    lines.push(`✓ custom options: sent message ${msg2.id}`);

    // 3. Batch pacing — sending multiple messages in sequence.
    //    Instead of firing all at once and relying on retry, space them out
    //    to stay below the ~5 req/s command limit. Each call still has retry
    //    as a safety net, but pacing prevents hitting the limit in the first place.
    const targetChannelIds: ChannelGuid[] = [channelId, channelId, channelId];
    let batchCount = 0;

    for (const targetId of targetChannelIds) {
      await withRetry(() =>
        messages.create({ channelId: targetId, content: `Step 3: batch message ${batchCount + 1}/${targetChannelIds.length}` }),
      );
      batchCount++;

      // Pace between calls — skip the delay after the last one.
      if (batchCount < targetChannelIds.length) {
        await pace(250);
      }
    }
    lines.push(`✓ batch pacing: sent ${batchCount} messages with 250ms gaps`);

    // 4. Non-retryable error — withRetry throws immediately on permanent failures.
    //    This demonstrates that permission/not-found errors don't waste time retrying.
    lines.push("✓ non-retryable: permanent errors (NotFound, NoPermission*) throw immediately");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.TooManyRequests:
          console.error("Rate limited after all retry attempts — commands max ~5 req/s");
          break;
        case ErrorCodeType.NotFound:
          console.error("Channel not found — it may have been deleted");
          break;
        case ErrorCodeType.NoPermissionToCreate:
          console.error("Missing createMessage permission in root-manifest.json");
          break;
        default:
          console.error("RootApiException:", err.errorCode);
      }
    } else if (err instanceof Error) {
      console.error("Unexpected error:", err.message);
    }
  }
}
