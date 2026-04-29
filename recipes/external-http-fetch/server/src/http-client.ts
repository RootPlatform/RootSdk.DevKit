// ============================================================================
// Recipe: External HTTP Fetch — the HTTP client
// SDK: Node.js global `fetch` + AbortController (built-in since Node 18)
// ============================================================================
//
// Wraps the runtime's global `fetch` with three things every external
// integration needs:
//
//   1. Timeout via AbortController. The default fetch has no timeout —
//      a slow upstream can hang the request indefinitely, blocking the
//      RPC handler that called it. AbortController + setTimeout fixes
//      this; the same signal propagates to BOTH the headers fetch and
//      the body read, so a slow trickling response can't outrun the
//      deadline.
//
//   2. Typed error mapping. Every failure mode becomes one of four
//      domain-specific Error subclasses (TimeoutError, NetworkError,
//      UpstreamUnavailableError, BadResponseError) so the calling
//      service handler can map them cleanly to proto error codes and
//      the client can branch UX on err.code.
//
//      The split between NetworkError, UpstreamUnavailableError, and
//      BadResponseError matters for retry decisions:
//        - NetworkError: couldn't reach the upstream at all (DNS,
//          connection refused, TLS). Retry-friendly.
//        - UpstreamUnavailableError: reached the upstream but it
//          answered with 5xx or 429. Retry-friendly, often after a
//          backoff.
//        - BadResponseError: reached the upstream and got a 4xx,
//          malformed JSON, or a body missing required fields. Don't
//          retry — the contract is broken, the same call gets the same
//          answer.
//
//   3. JSON parse + shape validation. The upstream's response shape is
//      not part of the wire contract with our client; we have to
//      validate it server-side. A missing field becomes BadResponseError
//      rather than `undefined` propagating to the response.
//
// Cleanup matters: `clearTimeout` runs after the body has been fully
// read, not just after headers. The signal stays armed throughout.
//
// What this file is NOT:
//   - No retry logic. An external integration with retries is its own
//     concern (transient vs permanent failures, exponential backoff,
//     idempotency). Add it as a wrapper around fetchJson when needed.
//   - No streaming. fetch returns a Promise<Response>; this helper
//     reads the entire body. Streaming responses (SSE, chunked) need
//     a different read pattern.
//   - No request body / non-GET methods. Easy to extend; this recipe's
//     toy upstream only does GET.
//
// ============================================================================

/** Request didn't complete (headers OR body) within the timeout.
 *  AbortController signaled cancellation; safe to retry. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Transport-layer failure (DNS, connection refused, TLS). fetch threw
 *  before a response was received. Usually transient; retry-friendly. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

/** Upstream answered but with a server-side error status (5xx) or a
 *  rate-limit (429). The request itself was well-formed; the upstream
 *  is unhappy. Usually transient; retry-friendly (often after a backoff
 *  or a Retry-After delay). Distinguished from NetworkError so callers
 *  can log + diagnose without conflating "I couldn't reach them" with
 *  "they said no." */
export class UpstreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamUnavailableError";
  }
}

/** Got a response from the upstream and could connect fine, but the
 *  contract is broken: 4xx status, malformed JSON, or missing the
 *  expected field. Don't retry — the same call gets the same answer. */
export class BadResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadResponseError";
  }
}

/** Max body bytes to include in BadResponseError messages. Keeps log
 *  lines bounded while still giving useful diagnostic context — most
 *  upstream error envelopes fit in 200 chars. */
const ERROR_BODY_SNIPPET_MAX = 200;

/**
 * Fetch a URL, parse the response as JSON, return the parsed body.
 *
 * Throws TimeoutError, NetworkError, UpstreamUnavailableError, or
 * BadResponseError on failure — never returns undefined or a
 * half-parsed value.
 *
 * The same AbortController signal covers both header fetch and body
 * read, so a slow streaming body can't sneak past the timeout. The
 * `clearTimeout` in `finally` runs only after both phases complete or
 * fail.
 */
export async function fetchJson<T = unknown>(
  url: string,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (err) {
      // AbortError fires when controller.abort() runs. There's no
      // canonical way to identify abort vs other transport errors —
      // Node's DOMException .name === "AbortError" is the convention.
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new TimeoutError(
          `Request to ${url} exceeded ${timeoutMs}ms before headers received`,
        );
      }
      // Anything else — DNS, connection refused, TLS — is a transport-
      // layer failure. The error's own message is usually enough.
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`Network failure calling ${url}: ${msg}`);
    }

    // Status check before reading the body. 5xx and 429 indicate the
    // upstream is unhappy but reachable — retry-friendly. 4xx (other
    // than 429) is a contract violation — don't retry.
    if (response.status >= 500 || response.status === 429) {
      const snippet = await readBodySnippet(response);
      throw new UpstreamUnavailableError(
        `Upstream ${url} returned ${response.status} ${response.statusText}${snippet ? `: ${snippet}` : ""}`,
      );
    }
    if (!response.ok) {
      const snippet = await readBodySnippet(response);
      throw new BadResponseError(
        `Upstream ${url} returned ${response.status} ${response.statusText}${snippet ? `: ${snippet}` : ""}`,
      );
    }

    // Read body. Same signal covers this — if the upstream sends headers
    // fast but trickles the body slowly, the controller's abort still
    // applies and an AbortError surfaces here as a TimeoutError.
    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new TimeoutError(
          `Body read from ${url} exceeded ${timeoutMs}ms after headers received`,
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadResponseError(`Upstream ${url} returned non-JSON body: ${msg}`);
    }

    return body as T;
  } finally {
    // Clear the timer regardless of outcome. Without this, a successful
    // response leaves the timer dangling until it fires (where it'd
    // call abort() on the already-completed request — a no-op, but
    // also keeps the Node event loop alive until the timer resolves).
    // Critical that this is in the OUTER try/finally so it runs after
    // both the headers fetch AND the body read.
    clearTimeout(timer);
  }
}

/**
 * Read up to ERROR_BODY_SNIPPET_MAX characters of the response body
 * for diagnostic logging. Best-effort — if reading fails (already
 * consumed, abort, etc.) returns an empty string rather than throwing.
 * Errors during diagnostic capture should not eclipse the original
 * error we're trying to report.
 */
async function readBodySnippet(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const trimmed = text.trim();
    return trimmed.length > ERROR_BODY_SNIPPET_MAX
      ? trimmed.slice(0, ERROR_BODY_SNIPPET_MAX) + "…"
      : trimmed;
  } catch {
    return "";
  }
}
