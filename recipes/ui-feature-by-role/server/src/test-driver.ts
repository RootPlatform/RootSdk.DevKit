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
} from "@rootsdk/server-app";
import { viewerService } from "./viewer-service";

const COMMAND = "/test-ui-feature-by-role";

let capturedCommunityId: CommunityGuid | undefined;

export function initializeTestDriver(communityId: CommunityGuid): void {
  capturedCommunityId = communityId;
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onTestCommand,
  );
}

/**
 * Command shape:  /test-ui-feature-by-role <userId1>,<userId2>,...
 *
 * For each userId, build a synthetic Client and call
 * viewerService.getViewerContext. Post one result block per user with the
 * returned flags as ✓ lines the harness can parse:
 *
 *   ✓ user_id=<id>
 *   ✓ is_owner=<bool>
 *   ✓ is_moderator=<bool>
 */
async function onTestCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith(COMMAND)) return;

  const messages = rootServer.community.channelMessages;
  const channelId = evt.channelId;

  try {
    const args = content.slice(COMMAND.length).trim();
    if (!args) {
      await messages.create({
        channelId,
        content: `✗ test driver: missing userIds argument. Usage: ${COMMAND} id1,id2,id3`,
      });
      return;
    }

    const userIds = args.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
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
      const response = await viewerService.getViewerContext({}, client);
      lines.push(`✓ user_id=${response.userId}`);
      lines.push(`✓ is_owner=${response.isOwner}`);
      lines.push(`✓ is_moderator=${response.isModerator}`);
    }

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await messages.create({ channelId, content: `✗ test driver error: ${msg}` });
  }
}
