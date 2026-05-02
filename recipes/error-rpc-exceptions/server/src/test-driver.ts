// ============================================================================
// TEST DRIVER — exercises ClaimService from a slash command.
//
// THIS FILE IS TEST INFRASTRUCTURE, NOT PART OF THE RECIPE'S LESSON.
// If you're forking this recipe, **delete this file** and the line in main.ts
// that calls `initializeTestDriver()`. Production recipes should never expose
// a self-test command.
//
// Why it exists: see ui-feature-by-role/server/src/test-driver.ts header for
// the full rationale. Same constraint here — Node-side test code can't
// directly invoke gen-client RPCs across the SDK boundary, so the harness
// drives the recipe via a slash command the recipe handles itself.
// ============================================================================

import {
  rootServer,
  Client,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  CommunityGuid,
  UserGuid,
  RootServerException,
} from "@rootsdk/server-app";
import { claimService } from "./claim-service";

const COMMAND = "/test-error-rpc-exceptions";

// Test-driver internal-error sentinel. Positive (matching the convention
// that negative values are reserved for built-in SDK errors) and well
// outside any recipe's error enum range so it can't collide with a real
// domain code. Test-only — recipe forks delete this whole file.
const TEST_DRIVER_ERROR = 999;

let capturedCommunityId: CommunityGuid | undefined;

export function initializeTestDriver(communityId: CommunityGuid): void {
  capturedCommunityId = communityId;
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onTestCommand,
  );
}

/**
 * Per-user invocation result. Either a successful response (rendered as
 * `✓ key=value` lines by the harness adaptor) or a typed RootServerException
 * with a numeric `error_code` the harness can match on via `expectedError`.
 */
type Outcome =
  | { kind: "ok"; fields: Record<string, string | number | boolean> }
  | { kind: "err"; code: number; message: string };

/**
 * Command shape:
 *
 *   /test-error-rpc-exceptions <method> <userId1>,<userId2>,... [<base64-json-request>]
 *
 * The third arg is optional and base64-encoded JSON. When present it's
 * decoded and passed as the request payload to the named method (e.g.
 * `claim` needs `{ name: "..." }`). When absent the request is `{}`.
 */
async function onTestCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith(COMMAND)) return;

  const messages = rootServer.community.channelMessages;
  const channelId = evt.channelId;

  try {
    const argString = content.slice(COMMAND.length).trim();
    if (!argString) {
      await messages.create({
        channelId,
        content: `✗ test driver: missing arguments. Usage: ${COMMAND} <method> id1,id2 [<base64-json-request>]`,
      });
      return;
    }

    // Parse three space-separated tokens: method, userIds, optional request.
    const tokens = argString.split(/\s+/);
    const method = tokens[0];
    const userIdArg = tokens[1];
    const requestB64 = tokens[2]; // may be undefined
    if (!method || !userIdArg) {
      await messages.create({
        channelId,
        content: `✗ test driver: missing userIds. Usage: ${COMMAND} <method> id1,id2 [<base64-json-request>]`,
      });
      return;
    }

    let requestPayload: Record<string, unknown> = {};
    if (requestB64) {
      try {
        const json = Buffer.from(requestB64, "base64").toString("utf8");
        requestPayload = JSON.parse(json);
      } catch (err) {
        await messages.create({
          channelId,
          content: `✗ test driver: failed to decode request payload — ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        return;
      }
    }

    const userIds = userIdArg.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    if (!capturedCommunityId) {
      await messages.create({
        channelId,
        content: "✗ test driver: communityId not captured at startup",
      });
      return;
    }

    const lines: string[] = [];
    for (const rawUserId of userIds) {
      const userId = rawUserId as unknown as UserGuid;
      const client: Client = {
        userId,
        communityId: capturedCommunityId,
        deviceIds: [],
      };

      const outcome = await invoke(method, requestPayload, client);
      // Always open the block with a ✓ user_id line so the harness's parser
      // can group by user — even when the rest of the block is failures.
      lines.push(`✓ user_id=${rawUserId}`);
      if (outcome.kind === "ok") {
        for (const [k, v] of Object.entries(outcome.fields)) {
          lines.push(`✓ ${k}=${v}`);
        }
      } else {
        lines.push(`✗ error_code=${outcome.code}`);
        lines.push(`✗ error_message=${outcome.message}`);
      }
    }

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await messages.create({ channelId, content: `✗ test driver error: ${msg}` });
  }
}

/**
 * Dispatch one RPC by name and translate the result into an Outcome.
 *
 * Field flattening:
 *   - getClaim: emits `claim_present` boolean; `name` only when present.
 *     The claimed_by user-id is non-deterministic across runs, so we emit
 *     `claimed_by_present` (boolean) instead of the raw id.
 *   - claim: emits `name` and `claimed_by_present` on success. Failures
 *     surface as typed errors via the catch below.
 *   - release: emits no fields — the harness's `expectedResponse: {}` matches.
 */
async function invoke(
  method: string,
  request: Record<string, unknown>,
  client: Client,
): Promise<Outcome> {
  try {
    switch (method) {
      case "getClaim": {
        const r = await claimService.getClaim({}, client);
        const fields: Record<string, string | number | boolean> = {
          claim_present: !!r.claimedBy,
        };
        if (r.name) fields.name = r.name;
        return { kind: "ok", fields };
      }
      case "claim": {
        const r = await claimService.claim(
          { name: (request.name as string) ?? "" },
          client,
        );
        return {
          kind: "ok",
          fields: {
            name: r.name,
            claimed_by_present: !!r.claimedBy,
          },
        };
      }
      case "release": {
        await claimService.release({}, client);
        return { kind: "ok", fields: {} };
      }
      default:
        return {
          kind: "err",
          code: TEST_DRIVER_ERROR,
          message: `unknown method "${method}"`,
        };
    }
  } catch (err: unknown) {
    if (err instanceof RootServerException) {
      return {
        kind: "err",
        code: err.code,
        message: err.message ?? "",
      };
    }
    // Unexpected non-typed exception. Surface it under the test-driver
    // sentinel so the harness sees a failure (and won't accidentally match
    // a real ClaimError code).
    return {
      kind: "err",
      code: TEST_DRIVER_ERROR,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
