// ============================================================================
// Recipe: External HTTP Fetch — RPC service
// SDK: gen-server abstract base, RootServerException
// ============================================================================
//
// One callable RPC: FetchUuid. Calls the upstream via fetchJson, validates
// the response shape, returns the typed result. Maps the http-client's
// thrown error classes to the proto's typed rejections so the client can
// match on err.code.
//
// The validation step matters: even if the upstream returns a 200, the
// body might not have the field we expect (the upstream changed its API,
// returned an error envelope instead of data, etc.). We check for `uuid`
// before returning to the caller — anything else becomes BAD_RESPONSE.
// ============================================================================

import { Client, RootServerException } from "@rootsdk/server-app";
import { UuidFetchServiceBase } from "@externalhttpfetch/gen-server";
import {
  FetchUuidRequest,
  FetchUuidResponse,
  UuidFetchError,
} from "@externalhttpfetch/gen-shared";
import {
  BadResponseError,
  NetworkError,
  TimeoutError,
  UpstreamUnavailableError,
  fetchJson,
} from "./http-client";

// Public, no-auth, returns `{"uuid": "<v4>"}`. Replace this with whatever
// your fork is calling. Kept as a constant rather than read from
// globalSettings to keep the recipe focused on the HTTP mechanic.
const UPSTREAM_URL = "https://httpbin.org/uuid";

// Generous default — most well-behaved public APIs return in well under
// a second, but we'd rather report TIMEOUT clearly than block the RPC
// for the platform's much longer hang threshold.
const FETCH_TIMEOUT_MS = 5_000;

interface UpstreamShape {
  uuid?: unknown;
}

export class UuidFetchService extends UuidFetchServiceBase {
  async fetchUuid(
    _request: FetchUuidRequest,
    _client: Client,
  ): Promise<FetchUuidResponse> {
    let body: UpstreamShape;
    let fetchedAt: string;
    try {
      body = await fetchJson<UpstreamShape>(UPSTREAM_URL, FETCH_TIMEOUT_MS);
      // Capture the timestamp at the moment the upstream actually
      // responded (after fetchJson resolves), not later. Validation
      // below could take measurable time on a more elaborate response;
      // the proto contract says fetched_at is when the upstream
      // responded, so capture that boundary precisely.
      fetchedAt = new Date().toISOString();
    } catch (err) {
      // Map the http-client's typed errors to the proto's typed
      // rejections. Each domain error class has a one-to-one
      // correspondence with one proto enum value. Three of the four
      // are retryable (TIMEOUT, NETWORK, UPSTREAM_UNAVAILABLE);
      // BAD_RESPONSE is not.
      if (err instanceof TimeoutError) {
        throw new RootServerException(UuidFetchError.TIMEOUT, err.message);
      }
      if (err instanceof NetworkError) {
        throw new RootServerException(UuidFetchError.NETWORK, err.message);
      }
      if (err instanceof UpstreamUnavailableError) {
        throw new RootServerException(
          UuidFetchError.UPSTREAM_UNAVAILABLE,
          err.message,
        );
      }
      if (err instanceof BadResponseError) {
        throw new RootServerException(UuidFetchError.BAD_RESPONSE, err.message);
      }
      // Anything else is unexpected. Re-throw — surfaces as an untyped
      // server error to the caller, which is the correct behavior for
      // bugs in the recipe code itself (vs. upstream failures we're
      // explicitly modeling).
      throw err;
    }

    // Shape validation. The upstream said 200 OK, but the body has to
    // have the field we're going to return. Anything missing or wrong
    // type is BAD_RESPONSE — the upstream's contract with us is broken,
    // and that's distinct from "the upstream is having a bad day"
    // (UPSTREAM_UNAVAILABLE).
    if (typeof body.uuid !== "string" || body.uuid.length === 0) {
      throw new RootServerException(
        UuidFetchError.BAD_RESPONSE,
        "Upstream response missing 'uuid' field or wrong type",
      );
    }

    return {
      uuid: body.uuid,
      fetchedAt,
    };
  }
}

export const uuidFetchService = new UuidFetchService();
