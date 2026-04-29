// ============================================================================
// Recipe: Per-User Cooldown — RPC service
// SDK: gen-server abstract base, RootServerException
// ============================================================================
//
// One callable RPC: Claim. Reads the caller's userId from `Client`,
// hands off to the atomic store helper, maps the rejection branch to
// the proto's typed error.
//
// The cooldown duration lives here as a constant. Forks that want
// admin-tunable cooldowns should compose with app-settings-flat-values
// — load it once at startup, refresh on the settings update event.
// Kept inline here so the recipe stays focused on the SQL atomicity
// lesson, not the settings-plumbing one.
// ============================================================================

import { Client, RootServerException } from "@rootsdk/server-app";
import { CooldownServiceBase } from "@peruser-cooldown/gen-server";
import {
  ClaimRequest,
  ClaimResponse,
  CooldownError,
} from "@peruser-cooldown/gen-shared";
import { getDb } from "./db";
import { tryClaim } from "./cooldown-store";

// 30 seconds. The number itself is arbitrary for a recipe — fork and
// pick something appropriate to your action. The constraint that
// matters in this codebase: the integration test runs back-to-back
// claims with sub-second latency between them, so the cooldown has
// to be comfortably larger than one harness step's round trip
// (roughly a few seconds) for the "second claim is rejected"
// assertion to hold.
const COOLDOWN_MS = 30_000;

export class CooldownService extends CooldownServiceBase {
  async claim(
    _request: ClaimRequest,
    client: Client,
  ): Promise<ClaimResponse> {
    // Capture `now` once and reuse it for the SQL params and the
    // returned timestamps. Reading `Date.now()` twice would let
    // sub-millisecond drift creep in between the row and the response.
    const now = Date.now();

    const result = await tryClaim(getDb(), client.userId, now, COOLDOWN_MS);

    if (result.kind === "cooldown") {
      const remainingSec = Math.ceil((result.cooldownEndsAt - now) / 1000);
      throw new RootServerException(
        CooldownError.NOT_ELAPSED,
        `Cooldown active — try again in ${remainingSec}s`,
      );
    }

    return {
      claimedAt: new Date(result.claimedAt).toISOString(),
      cooldownEndsAt: new Date(result.cooldownEndsAt).toISOString(),
    };
  }
}

export const cooldownService = new CooldownService();
