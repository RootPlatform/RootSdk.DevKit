// ============================================================================
// TEST DRIVER — exercises the recipe's RPC service from a slash command.
//
// THIS FILE IS TEST INFRASTRUCTURE, NOT PART OF THE RECIPE'S LESSON.
// If you're forking this recipe, **delete this file** and the line in main.ts
// that calls `initializeTestDriver()`. Production recipes should never expose
// a self-test command.
//
// Why it exists:
// The test harness in `Code/Ops.Testing/test-devkit/test-recipes` cannot
// invoke the recipe's RPC service from outside the SDK runtime (the gen-client
// is a browser/native target; the harness runs Node with a platform apiclient
// that has no path into app-RPC services). The simplest reliable trigger is a
// slash command — the harness sends it, the server exercises its own RPCs
// internally with synthesized `Client` objects for each user, and posts the
// results back as parseable lines for the harness to validate.
//
// Trade-off:
// This contaminates the recipe with test-only code that an agent forking the
// recipe might inadvertently keep. The defence is loud comments + the README
// + the hope that anyone forking is going to delete things they don't recognise.
// If/when a clean platform-side path to invoke arbitrary app RPCs lands, this
// file goes away and the harness moves to that path instead.
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
import { viewerService } from "./viewer-service";

const COMMAND = "/test-ui-feature-by-role";

// Test-driver internal-error sentinel. Positive (matching the proto's
// "negative values reserved for built-in SDK errors" convention) and well
// outside the recipe's ViewerError enum range so it can never collide with a
// real authorization code. Test-only — recipe forks delete this whole file.
const TEST_DRIVER_ERROR = 999;

/**
 * Per-user invocation result. Either a successful response (rendered as
 * `✓ key=value` lines by the harness adaptor) or a typed RootServerException
 * with a numeric `error_code` the harness can match on via `expectedError`.
 */
type Outcome =
  | { kind: "ok"; fields: Record<string, string | number | boolean> }
  | { kind: "err"; code: number; message: string };

let capturedCommunityId: CommunityGuid | undefined;

export function initializeTestDriver(communityId: CommunityGuid): void {
  capturedCommunityId = communityId;
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onTestCommand,
  );
}

/**
 * Command shape:  /test-ui-feature-by-role <method> <userId1>,<userId2>,...
 *
 * For each userId, build a synthetic Client and call the named method on
 * viewerService. Per user, emit either:
 *
 *   ✓ user_id=<id>           ← success block start
 *   ✓ <key>=<value>          ← response fields, snake_case
 *
 * or:
 *
 *   ✓ user_id=<id>           ← always start the block as ✓ so the harness
 *                              can group by user, even on failures
 *   ✗ error_code=<numeric>   ← typed RootServerException; matches recipe's
 *                              proto enum value
 *   ✗ error_message=<text>
 *
 * Method dispatch is by name so the harness can exercise multiple RPCs from
 * the same recipe. Unknown methods produce a driver-level error message that
 * doesn't match the per-user format, so the harness reports a generic
 * "no response found" — which is the correct signal that the recipe and
 * the harness disagree on what's available.
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
        content: `✗ test driver: missing arguments. Usage: ${COMMAND} <method> id1,id2,id3`,
      });
      return;
    }

    // First whitespace-separated token is the method name; the rest is the
    // comma-separated user list.
    const firstSpace = argString.indexOf(" ");
    if (firstSpace === -1) {
      await messages.create({
        channelId,
        content: `✗ test driver: missing userIds. Usage: ${COMMAND} <method> id1,id2,id3`,
      });
      return;
    }
    const method = argString.slice(0, firstSpace).trim();
    const userIdArg = argString.slice(firstSpace + 1).trim();

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
      // UserGuid is a branded string type; cast through unknown since the
      // userIds came in over the wire as plain strings.
      const userId = rawUserId as unknown as UserGuid;
      const client: Client = {
        userId,
        communityId: capturedCommunityId,
        deviceIds: [],
      };

      const outcome = await invoke(method, client);
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
 * Dispatch one RPC by name and translate the result into an Outcome. Catches
 * RootServerException so the harness sees typed failures as success-shaped
 * blocks with `error_code` lines (not as a driver crash).
 */
async function invoke(method: string, client: Client): Promise<Outcome> {
  try {
    switch (method) {
      case "getViewerContext": {
        const r = await viewerService.getViewerContext({}, client);
        return {
          kind: "ok",
          fields: {
            is_owner: r.isOwner,
            is_moderator: r.isModerator,
          },
        };
      }
      case "getModeratorReport": {
        const r = await viewerService.getModeratorReport({}, client);
        return { kind: "ok", fields: { data: r.data } };
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
    // a real ViewerError code).
    return {
      kind: "err",
      code: TEST_DRIVER_ERROR,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
