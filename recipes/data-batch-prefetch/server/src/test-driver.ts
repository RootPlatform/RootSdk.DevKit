// ============================================================================
// TEST DRIVER — exercises ActivityService from a slash command.
//
// THIS FILE IS TEST INFRASTRUCTURE, NOT PART OF THE RECIPE'S LESSON.
// If you're forking this recipe, **delete this file** and the line in main.ts
// that calls `initializeTestDriver()`. Production recipes should never expose
// a self-test command.
//
// Same protocol as the prior recipes' drivers:
//   /test-data-batch-prefetch <method> <userIds> [<base64-json-request>]
//
// Flattening rules for this recipe:
//
//   ListActivities response:
//     activity_count            — total rows
//     distinct_actor_count      — distinct actor_ids in the rows
//     actor_0, actor_1, …       — each distinct actor_id, in first-seen
//                                 order (so the harness can __ref them
//                                 into BatchGetOwners' request)
//
//   BatchGetOwners response:
//     owner_count               — number of resolved owners
//     all_requested_present     — true iff response covers every requested id
//     first_display_name        — sample owner's display_name for spot-checks
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
import { activityService } from "./activity-service";

const COMMAND = "/test-data-batch-prefetch";

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
    const requestB64 = tokens[2];
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

interface ActivityWire {
  id: bigint;
  action: string;
  actorId: string;
  occurredAt: string;
}

interface OwnerInfoWire {
  id: string;
  displayName: string;
  color: string;
}

/**
 * Flatten the activities response into summary fields. The harness uses
 * actor_0, actor_1, … to chain into the BatchGetOwners step via __ref.
 * "First-seen" order is deterministic across runs (ListActivities
 * returns rows ORDER BY occurred_at DESC, id DESC; the seeded data has
 * stable timestamps).
 */
function summarizeActivities(
  activities: ActivityWire[],
): Record<string, string | number | boolean> {
  const fields: Record<string, string | number | boolean> = {
    activity_count: activities.length,
  };
  const seen = new Set<string>();
  const distinct: string[] = [];
  for (const a of activities) {
    if (!seen.has(a.actorId)) {
      seen.add(a.actorId);
      distinct.push(a.actorId);
    }
  }
  fields.distinct_actor_count = distinct.length;
  for (let i = 0; i < distinct.length; i++) {
    fields[`actor_${i}`] = distinct[i];
  }
  return fields;
}

/**
 * Flatten the owners-map response into summary fields. The harness asserts
 * on owner_count and all_requested_present (the recipe's contract: caller
 * gets back what exists, missing ids are silently absent).
 */
function summarizeOwners(
  ownersMap: { [key: string]: OwnerInfoWire } | undefined,
  requestedIds: string[],
): Record<string, string | number | boolean> {
  const owners = ownersMap ?? {};
  const presentIds = Object.keys(owners);
  const fields: Record<string, string | number | boolean> = {
    owner_count: presentIds.length,
    all_requested_present:
      requestedIds.length > 0 &&
      requestedIds.every((id) => id in owners),
  };
  if (presentIds.length > 0) {
    fields.first_display_name = owners[presentIds[0]].displayName;
  }
  return fields;
}

async function invoke(
  method: string,
  request: Record<string, unknown>,
  client: Client,
): Promise<Outcome> {
  try {
    switch (method) {
      case "listActivities": {
        const r = await activityService.listActivities({}, client);
        return {
          kind: "ok",
          fields: summarizeActivities((r.activities ?? []) as ActivityWire[]),
        };
      }
      case "batchGetOwners": {
        const ownerIds = Array.isArray(request.ownerIds)
          ? (request.ownerIds as string[])
          : [];
        const r = await activityService.batchGetOwners({ ownerIds }, client);
        return {
          kind: "ok",
          fields: summarizeOwners(
            r.owners as { [key: string]: OwnerInfoWire } | undefined,
            ownerIds,
          ),
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
