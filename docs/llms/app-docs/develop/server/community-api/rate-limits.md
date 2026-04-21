---
path: app-docs/develop/server/community-api/rate-limits.md
audience: app
category: guide
summary: Stay under the community API's rate limits with pacing and retry-with-backoff.
---

# Rate limits

Stay under the community API's rate limits with pacing and retry-with-backoff.

## Why rate limits exist

The platform enforces per-connection limits so that one misbehaving app or bot cannot degrade the experience for an entire community. Limits are not arbitrary caps. They are sized to the cost of the operation and the realistic human-scale usage pattern. A command mutates state and fans out events to every connected member, a query reads a single (often cached) row, and an upload commits bytes to persistent storage. The budgets reflect that.

Exceeding a limit returns `RootApiException` with `errorCode` set to `ErrorCodeType.TooManyRequests`. The call fails, nothing else happens. The server does not currently return a `retry-after` hint, so backoff is purely client-side.

## Operation classes and limits

| Operation class | Limit | Typical calls |
|---|---|---|
| Commands (create, edit, delete) | ~5 req/s | `channelMessages.create`, `communityRoles.delete`, `communityMemberBans.kick` |
| Queries (get, list) | ~20 req/s | `channelMessages.list`, `communityMembers.get`, `communityRoles.list` |
| Calls | ~1 req/s | `channelWebRtcs.kick`, `channelWebRtcs.setMuteAndDeafenOther` |
| Uploads | 100 files or 250 MB/hr | `channelFiles.create`, `dataStore.assets.create` |

Limits are approximate and subject to change. Treat them as soft targets. Use pacing to avoid hitting them, and use `withRetry()` (see below) as the safety net rather than hard-coding counts.

### Commands

Mutations to community state: posting a message, editing a channel description, creating a role, deleting a pin, kicking a member. Commands are the expensive path because the server validates the request, persists the change, and broadcasts an event to every connected member of the community.

### Queries

Reads that do not mutate state: loading message history, resolving a member profile, listing roles for a picker. The ~20 req/s budget is four times the command budget because reads are cheaper (no validation of new state, no broadcast) and because UIs and backfills fundamentally need to read more than they write.

### Calls

Voice channel moderation operations: `channelWebRtcs.kick` removes a member from a voice channel, and `channelWebRtcs.setMuteAndDeafenOther` force-mutes or deafens a participant. The ~1 req/s budget reflects that each operation coordinates with real-time media infrastructure.

### Uploads

File and asset uploads: message attachments, channel banners, app-bundled assets. Unlike the others, uploads have two ceilings enforced together over a rolling hour: **100 files** (prevents many-tiny-file abuse) and **250 MB** (prevents few-huge-file abuse). Whichever you hit first stops you, and both reset on a rolling window, not a calendar hour. For bulk operations (migrating a community's existing media library, for example), plan the work across hours rather than minutes.

## Handle `TooManyRequests`

Catch `RootApiException`, check for `ErrorCodeType.TooManyRequests`, and retry with exponential backoff and jitter:

```ts
import { rootServer, RootApiException, ErrorCodeType } from "@rootsdk/server-app";

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T>
{
  for (let attempt = 0; ; attempt++)
  {
    try
    {
      return await operation();
    }
    catch (err: unknown)
    {
      const retryable =
        err instanceof RootApiException
          ? err.errorCode === ErrorCodeType.TooManyRequests
            || err.errorCode === ErrorCodeType.ServerError
            || err.errorCode === ErrorCodeType.Timeout
            || err.errorCode === ErrorCodeType.StillProcessing
          : true;

      if (attempt >= maxRetries || !retryable) throw err;

      const cap = Math.min(1000 * 2 ** attempt, 15000);
      const delay = Math.random() * cap;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

Wrap any SDK call:

```ts
const msg = await withRetry(() =>
  rootServer.community.channelMessages.create({ channelId, content }),
);
```

**Full jitter** (a random delay between zero and the computed cap) spreads retries more effectively than a fixed delay or equal jitter when several bot instances hit the same limit at the same moment. Fixed delays produce synchronised retry storms, full jitter breaks the sync.

## Pace loops

Retry handles the unexpected. Pacing prevents the limit in the first place. When you iterate over a list and issue one command per item, insert a small delay between calls:

```ts
async function pace(delayMs: number = 250): Promise<void>
{
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

for (const channelId of channelIds)
{
  await withRetry(() =>
    rootServer.community.channelMessages.create({ channelId, content }),
  );
  await pace(250);
}
```

A 250 ms gap keeps a command loop at 4 req/s, comfortably below the ~5 req/s threshold with headroom for retries that overlap the loop. Queries can be paced much more aggressively (50 ms or less). Calls should not be looped at all, pace them manually or gate them behind a user action.

## Retryable versus non-retryable errors

| Error code | Retryable | Why |
|---|---|---|
| `TooManyRequests` | Yes | Rate limit, back off and try again |
| `ServerError` | Yes | Transient server issue |
| `Timeout` | Yes | Request timed out before completing |
| `StillProcessing` | Yes | Server still working on a prior request |
| `NotFound` | No | Resource does not exist, a retry will not change that |
| `NoPermissionTo*` | No | Missing manifest permission, a retry will not grant it |
| `AlreadyExists` | No | Retry would hit the same conflict |
| `RequestValidationFailed` | No | Fix the request, then call once |

Network-level failures (DNS errors, connection resets) that are not `RootApiException` instances are generally transient and worth retrying.

## Key behaviors

- **No server-provided `retry-after`**: backoff is entirely client-side.
- **`setTimeout` is fine for retry waits**: retry delays are milliseconds to seconds. For work that must survive restarts (scheduled recurrences, delays of minutes or hours), use the job scheduler instead.
- **Log retries at `warn`, final failures at `error`**: a successful retry is expected behavior under load, not a bug. Reserve `console.error` for the call that fails after all retries are exhausted.
- **Pacing beats retry**: if you know up front that you are about to issue N commands, pace the loop. Reserve `withRetry()` for the calls whose rate you cannot predict.