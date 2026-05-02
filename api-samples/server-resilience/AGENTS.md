---
kind: api-sample
category: server-lifecycle-utilities
description: Retry transient failures (rate limits, server errors, timeouts) with exponential backoff and jitter
domain: Retry & backoff
key_methods: [withRetry() wrapper, retryable error classification, batch pacing]
---

# API Sample: Resilience — Retry & Backoff for Rate Limits

Retry transient failures (rate limits, server errors, timeouts) with exponential backoff and jitter. Copy the `withRetry()` helper into any bot or app.

## Source Files

| File | What it covers |
|------|---------------|
| [resilience.ts](src/resilience.ts) | `withRetry()` wrapper, retryable error classification, batch pacing |

## Pattern

```typescript
import { rootServer } from "@rootsdk/server-bot";

const msg = await withRetry(() =>
  rootServer.community.channelMessages.create({ channelId, content })
);
```

## Retryable vs Non-Retryable Errors

| Error Code | Retryable | Why |
|-----------|-----------|-----|
| `TooManyRequests` | Yes | Rate limit — back off and retry |
| `ServerError` | Yes | Transient server issue |
| `Timeout` | Yes | Request timed out |
| `StillProcessing` | Yes | Server still working on prior request |
| `NotFound` | No | Resource doesn't exist — won't appear on retry |
| `NoPermissionTo*` | No | Missing permission in root-manifest.json — won't change on retry |
| `AlreadyExists` | No | Duplicate — retry would hit the same conflict |
| `RequestValidationFailed` | No | Invalid input — fix the request, don't retry it |
| Non-SDK errors | Yes | Network disconnects, DNS failures are typically transient |

## Rate Limits

Server-enforced limits (approximate). Exceeding these returns `TooManyRequests`.

| Operation | Limit |
|-----------|-------|
| Commands (create/edit/delete) | ~5 req/s |
| Queries (get/list) | ~20 req/s |
| Profile updates | ~3 per 5 min |
| Calls | ~1 req/s |
| Auth | ~2 req/s |
| Uploads | 100 files or 250 MB/hr |

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- `channel.createMessage` — only for the `/server-resilience` command trigger. The `withRetry()` helper itself requires no permissions.

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Exponential backoff with full jitter** — delay = `random(0, min(baseDelayMs * 2^attempt, maxDelayMs))`. Full jitter spreads retries more effectively than fixed or equal jitter when multiple bots hit the same limit.
- **Defaults** — 3 retries, 1000ms base delay, 15000ms max delay. First retry waits 0–1s, second 0–2s, third 0–4s.
- **Non-RootApiException errors retry** — network-level failures (disconnects, DNS) are transient in a bot environment and worth retrying.
- **Permanent failures throw immediately** — permission errors, not-found, validation errors skip all retries and throw on the first attempt.
- **Retry logging uses `console.warn`** — a successful retry is expected behavior under load, not an error. Use `console.error` only for final failures.
- **`setTimeout` is fine for retry delays** — retry waits are milliseconds to seconds. For scheduled work (minutes, hours, recurring), use `server-jobs` instead — jobs survive restarts, `setTimeout` does not.
- **Batch pacing prevents rate limits** — when sending multiple commands in sequence, space them with a 250ms delay between calls to stay below the ~5 req/s limit. Each call still wraps in `withRetry()` as a safety net.
- **No server-provided retry-after** — `RootApiException` does not currently expose a retry-after delay. Backoff is purely client-side.
