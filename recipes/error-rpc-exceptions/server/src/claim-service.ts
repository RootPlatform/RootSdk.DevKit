// ============================================================================
// Recipe: RPC Exceptions — RPC service (the lesson)
// SDK: gen-server abstract base, RootServerException, broadcast helpers
// ============================================================================
//
// The lesson lives in `claim()`. Three things to notice:
//
//   1. Every failure path throws `RootServerException(ClaimError.X, msg)`.
//      The first argument is the typed error code declared in the proto;
//      the second is a freeform message. The client matches on the code,
//      not the message — codes are stable, messages are explanatory.
//
//   2. Validation runs first (NAME_EMPTY, NAME_TOO_LONG), then state
//      conflict (NAME_ALREADY_CLAIMED). Order matters: validation errors
//      are deterministic (the request itself is malformed), while state
//      errors depend on what's stored. Validating first means the server
//      doesn't even consult storage for invalid requests.
//
//   3. The error-message text is meant for logs and debug surfaces, not
//      end-user UI. The client renders its own user-facing strings keyed
//      off the error code (see App.tsx). This separation matters because
//      message copy varies by audience (admin vs end-user, English vs
//      localized) — and the user-facing copy lives on the client, where
//      the server has no visibility into it.
//
// Notes on broadcast scope:
//   `BroadcastNameClaimed` reaches connected CLIENTS, not sibling app-
//   server instances. A multi-instance deployment that wanted cross-
//   instance cache invalidation would need an out-of-band channel; this
//   recipe targets the common single-instance case.
// ============================================================================

import { Client, RootServerException } from "@rootsdk/server-app";
import { ClaimServiceBase } from "@errorrpcexceptions/gen-server";
import {
  ClaimRequest,
  ClaimResponse,
  ClaimError,
  GetClaimRequest,
  GetClaimResponse,
  ReleaseRequest,
  ReleaseResponse,
} from "@errorrpcexceptions/gen-shared";
import { claimIfEmpty, getClaim, releaseClaim } from "./name-store";

const NAME_MAX_LENGTH = 32;

export class ClaimService extends ClaimServiceBase {
  async getClaim(_request: GetClaimRequest, _client: Client): Promise<GetClaimResponse> {
    const stored = await getClaim();
    return stored
      ? { name: stored.name, claimedBy: stored.claimedBy }
      : {};
  }

  async claim(request: ClaimRequest, client: Client): Promise<ClaimResponse> {
    // 1. Validation: empty name. The client UI can prevent this with input
    //    validation, but the server still checks because clients are
    //    untrusted.
    const name = request.name.trim();
    if (name.length === 0) {
      throw new RootServerException(
        ClaimError.NAME_EMPTY,
        "Name cannot be empty.",
      );
    }

    // 2. Validation: name too long. Same validate-first rationale —
    //    deterministic from the request alone, no storage access needed.
    if (name.length > NAME_MAX_LENGTH) {
      throw new RootServerException(
        ClaimError.NAME_TOO_LONG,
        `Names are limited to ${NAME_MAX_LENGTH} characters.`,
      );
    }

    // 3. State: attempt the atomic claim. Returns undefined when the slot
    //    was already taken — translate that into the typed error so the
    //    client's catch can branch on it.
    const claimedBy = client.userId;
    const stored = await claimIfEmpty({ name, claimedBy });
    if (!stored) {
      throw new RootServerException(
        ClaimError.NAME_ALREADY_CLAIMED,
        "Name slot is already claimed.",
      );
    }

    // 4. Tell connected clients. Audience "all" because every connected
    //    client wants to see who claimed what. Empty-payload broadcasts
    //    that force a re-fetch are also valid (see app-settings-flat-
    //    values' SettingsChanged) — payload-bearing broadcasts save the
    //    re-fetch when the new state is known up front.
    this.broadcastNameClaimed(
      { name, claimedBy, released: false },
      "all",
    );

    return { name, claimedBy };
  }

  async release(_request: ReleaseRequest, _client: Client): Promise<ReleaseResponse> {
    // No-op when nothing's claimed. Releasing without a prior claim isn't
    // an error condition — the post-state is the same either way (slot
    // empty), so we don't bother throwing. Keeps the lesson focused on
    // claim()'s three error codes.
    await releaseClaim();

    // Same audience reasoning as claim(). One event type covers both claim
    // and release; the `released` flag tells the client which scenario it
    // is. Saves declaring a parallel NameReleasedEvent.
    this.broadcastNameClaimed(
      { name: "", claimedBy: "", released: true },
      "all",
    );

    return {};
  }
}

export const claimService = new ClaimService();
