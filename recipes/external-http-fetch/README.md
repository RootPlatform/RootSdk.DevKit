# Recipe: External HTTP Fetch

> *"How do I call an external HTTP API from my server, with timeouts and typed error handling, and surface the result to the client?"*

A small but foundational recipe. The lesson is the **shape** of an external HTTP integration: timeout via `AbortController`, three named failure modes, JSON parse + shape validation, typed-error mapping that the client can branch on. Everything that grows from here — webhooks, retries, third-party APIs — starts with this.

The toy upstream is `https://httpbin.org/uuid`, a stable public endpoint that returns `{"uuid": "<v4>"}`. Replace it with whatever your fork actually calls; the structure carries forward.

## TL;DR

```
client    server                       upstream
──────    ──────                       ────────
[click] ──fetchUuid()──►
                       │
                       ├── AbortController + setTimeout(5s)
                       ├── fetch(url, { signal }) ─────────► GET /uuid
                       │                                   ◄ {"uuid":"..."}
                       ├── response.ok? body.uuid?
                       ◄── { uuid, fetchedAt }
                       │   OR
                       ◄── RootServerException(TIMEOUT|NETWORK|BAD_RESPONSE)
        ◄── render result, OR render typed error UX
```

## Four named failure modes

Every external integration has the same four failure shapes. Three are retryable, one isn't — that's the call the client UX has to make.

| Code | When | Retryable? |
|---|---|---|
| `TIMEOUT` | Headers OR body didn't complete within the deadline. AbortController fired. | Yes — usually transient |
| `NETWORK` | DNS, connection refused, TLS — `fetch` threw before any response. | Yes — usually transient |
| `UPSTREAM_UNAVAILABLE` | Reached the upstream, but it returned 5xx or 429. | Yes — often after a backoff or `Retry-After` delay |
| `BAD_RESPONSE` | Got a response with 4xx (other than 429), malformed JSON, or missing required field. | **No** — the contract is broken; retry won't fix it |

Mapping these to typed errors (`RootServerException` with a numeric code matching the proto enum) lets the client branch on `err.code` and render appropriate UX — a "retry" button for the first three, an "upstream broken, contact support" message for the last. The `App.tsx` in this recipe shows the branch.

Why split `NETWORK` from `UPSTREAM_UNAVAILABLE` even though both retry? Because diagnostics work differently. A `NETWORK` error means **you** can't reach the upstream — DNS misconfig, firewall, expired cert. An `UPSTREAM_UNAVAILABLE` error means **the upstream** is having a bad day — their service is down, you're rate-limited, etc. Logging the wrong one sends the on-call to the wrong place.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services + typed errors | One callable RPC + three typed rejections (TIMEOUT, NETWORK, BAD_RESPONSE) |
| [`api-samples/client-app-services`](../../api-samples/client-app-services) | Calling app services from the client | The fetch button + typed-error UX branch |

External HTTP itself isn't an api-sample — api-samples cover Root APIs specifically. The `fetchJson` helper in this recipe (built on Node's global `fetch` + `AbortController`) is the canonical reference for outbound HTTP from a Root server until/unless an api-sample lands.

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) is minimal — no settings, no admin gate. The only permission is `channel.createMessage` for the test driver. Outbound HTTP doesn't require a manifest permission; the runtime allows it by default.

### 2. Proto

[`networking/src/uuid_fetch_service.proto`](networking/src/uuid_fetch_service.proto) — one RPC, four error codes. The error enum is the contract that lets clients branch on outcome:

```proto
enum UuidFetchError {
  UUID_FETCH_ERROR_UNSPECIFIED = 0;
  UUID_FETCH_ERROR_TIMEOUT = 1;
  UUID_FETCH_ERROR_NETWORK = 2;
  UUID_FETCH_ERROR_UPSTREAM_UNAVAILABLE = 3;
  UUID_FETCH_ERROR_BAD_RESPONSE = 4;
}
```

Four is the right granularity for most integrations. Real apps may add domain-specific codes for upstream-specific cases (e.g., a dedicated `RATE_LIMITED` if the upstream returns 429 with a parseable `Retry-After` header), but this set covers the structural shape.

### 3. The HTTP helper

[`server/src/http-client.ts`](server/src/http-client.ts) is the recipe's central artifact. ~100 lines, two responsibilities:

**Timeout via AbortController:**

```typescript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(url, { signal: controller.signal });
  // …status checks…
  const body = await response.json();      // signal also covers this
  return body as T;
} finally {
  clearTimeout(timer);                      // runs after BOTH phases
}
```

Two things to internalize:

1. **The same `signal` covers both phases.** Headers and body are separate reads — a slow trickling body can still outrun the deadline if the timer is cleared right after headers arrive. The signal stays armed throughout.
2. **`clearTimeout` lives in the OUTER `finally`.** A successful response otherwise leaves the timer dangling until it fires (where it'd call `abort()` on a completed request — a no-op, but the timer also keeps the Node event loop alive until it resolves). Always pair `setTimeout` + `AbortController` with cleanup at the absolute boundary of the operation.

**Typed error mapping:**

Four Error subclasses (`TimeoutError`, `NetworkError`, `UpstreamUnavailableError`, `BadResponseError`). The service handler maps each one to its proto code; the client matches `err.code` and renders the right UX. Anything else (a bug in the recipe code itself) re-throws to the SDK's default error path.

Status code routing: `>= 500` or `429` becomes `UpstreamUnavailableError` (retryable); other non-2xx becomes `BadResponseError` (not retryable). The split keeps the retry decision honest — collapsing 503 (transient) and 400 (caller bug) into the same code would lie about whether retrying is the right move.

Each thrown `BadResponseError` and `UpstreamUnavailableError` includes up to 200 characters of the response body for diagnostics — usually the upstream's error envelope, which is the difference between "useful log line" and "guess what 500 meant."

### 4. The service

[`server/src/uuid-fetch-service.ts`](server/src/uuid-fetch-service.ts) is the consumer. Calls `fetchJson`, validates the response shape, returns the typed result. Note the **shape validation step**:

```typescript
if (typeof body.uuid !== "string" || body.uuid.length === 0) {
  throw new RootServerException(
    UuidFetchError.BAD_RESPONSE,
    "Upstream response missing 'uuid' field or wrong type",
  );
}
```

Even when the upstream returns 200 OK, the body might not have what we expected — the API changed, an error envelope came back instead of data, etc. The validation step closes the gap between "got a response" and "got a useful response." Without it, `undefined` propagates into the wire response and the client sees a server-typed error from somewhere downstream that's much harder to diagnose.

### 5. The client

[`client/src/App.tsx`](client/src/App.tsx) shows why the typed errors earn their keep. The `toErrorState` switch maps `err.code` to a `retryable` boolean; the UI uses that to decide whether to suggest a retry. The same recipe with one untyped error code wouldn't be able to do this — every failure would look the same to the user.

## Does NOT cover

| Concern | Lives in / status |
|---|---|
| Authentication (Bearer tokens, API keys, OAuth) | Future recipe |
| Retries with exponential backoff | Future recipe; wraps `fetchJson` |
| Inbound webhooks | Future recipe |
| Streaming responses (SSE, chunked) | Future recipe; needs a different read pattern than `response.json()` |
| Request bodies / non-GET methods | Out of scope; easy to extend `fetchJson` to take `{method, body, headers}` |
| Caching responses with TTL | Future recipe |
| Idempotency keys | Domain-specific; out of scope here |
| Per-instance rate limiting on outbound calls | Out of scope; needed when the upstream enforces RPS limits |
| Structured logging at error catch sites | Out of scope here; production forks should log each thrown error class once with its status code + body snippet so on-call has a trail |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-external-http-fetch` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
>
> 1. Delete `server/src/test-driver.ts`.
> 2. Remove the `import { initializeTestDriver } from "./test-driver"` line at the top of `server/src/main.ts` AND the `initializeTestDriver(state.communityId)` call inside `onStarting`. The function should end up as just:
>
>    ```typescript
>    async function onStarting(_state: RootAppStartState): Promise<void> {
>      rootServer.lifecycle.addService(uuidFetchService);
>    }
>    ```
>
> 3. Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages.
>
> Production recipes should never expose a self-test command.

## Build and run

```bash
# From this directory
npm install
npm run build       # builds networking → server → client

# Then in two terminals, each starting from this recipe root
# (set DEV_TOKEN in server/.env first):
cd server && npm run server      # devhost — terminal 1
# In a separate terminal, also from this recipe root:
cd client && npm run client      # vite — terminal 2
```

Open the client URL Vite prints and click "Fetch UUID". You'll see a fresh UUID each click, with a `fetchedAt` timestamp.
