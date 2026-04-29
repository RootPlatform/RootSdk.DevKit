// ============================================================================
// TEST DRIVER — exercises CooldownService from a slash command.
//
// THIS FILE IS TEST INFRASTRUCTURE, NOT PART OF THE RECIPE'S LESSON.
// If you're forking this recipe, **delete this file** and the line in main.ts
// that calls `initializeTestDriver()`. Production recipes should never expose
// a self-test command.
//
// Same protocol as the prior recipes' drivers:
//   /test-per-user-cooldown <method> <userIds> [<base64-json-request>]
//
// Each userId is invoked as a separate Client — that's how the test
// asserts that user-A's cooldown does not affect user-B.
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
import { cooldownService } from "./cooldown-service";

const COMMAND = "/test-per-user-cooldown";

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

type Outcome =
  | { kind: "ok"; fields: Record<string, string | number | boolean> }
  | { kind: "err"; code: number; message: string };

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

    const tokens = argString.split(/\s+/);
    const method = tokens[0];
    const userIdArg = tokens[1];
    if (!method || !userIdArg) {
      await messages.create({
        channelId,
        content: `✗ test driver: missing userIds. Usage: ${COMMAND} <method> id1,id2`,
      });
      return;
    }

    // No request payload decode — ClaimRequest is empty, the harness
    // sends nothing in tokens[2]. Other recipes' drivers decode a
    // base64 JSON payload at this point; if you fork this recipe and
    // add request fields, copy that pattern from one of them.

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

      const outcome = await invoke(method, client);
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

async function invoke(method: string, client: Client): Promise<Outcome> {
  try {
    switch (method) {
      case "claim": {
        const r = await cooldownService.claim({}, client);
        // Flatten to shape-checkable fields. The actual timestamps
        // are non-deterministic; assertions check shape (both fields
        // present and non-empty ISO strings).
        return {
          kind: "ok",
          fields: {
            claimed_at_present:
              typeof r.claimedAt === "string" && r.claimedAt.length > 0,
            cooldown_ends_at_present:
              typeof r.cooldownEndsAt === "string" && r.cooldownEndsAt.length > 0,
          },
        };
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
      return { kind: "err", code: err.code, message: err.message ?? "" };
    }
    return {
      kind: "err",
      code: TEST_DRIVER_ERROR,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
