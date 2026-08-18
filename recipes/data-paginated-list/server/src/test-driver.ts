// ============================================================================
// TEST DRIVER — exercises ListService from a slash command.
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
import { listService } from "./list-service";

const COMMAND = "/test-data-paginated-list";

// Test-driver internal-error sentinel. Positive (matching the convention
// that negative values are reserved for built-in SDK errors) and well outside
// any recipe's error enum range so it can't collide with a real domain code.
// Test-only — recipe forks delete this whole file.
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
 * Per-user invocation result. The test driver flattens response payloads to
 * `key=value` lines the harness can match against `expectedResponse`.
 */
type Outcome =
  | { kind: "ok"; fields: Record<string, string | number | boolean> }
  | { kind: "err"; code: number; message: string };

/**
 * Command shape:
 *
 *   /test-data-paginated-list <method> <userId1>,<userId2>,... [<base64-json-request>]
 *
 * The third arg is optional and base64-encoded JSON. When present, it's
 * decoded and passed as the request payload to the named method. When
 * absent, the request payload is `{}`.
 *
 * Per user, emit either:
 *
 *   ✓ user_id=<id>           ← always start the block as ✓ for grouping
 *   ✓ <key>=<value>          ← response summary fields (snake_case)
 *
 * or:
 *
 *   ✓ user_id=<id>
 *   ✗ error_code=<numeric>   ← typed RootServerException
 *   ✗ error_message=<text>
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
 * For listRecords: flattens the (potentially long) records array into
 * summary fields the harness can assert on — record_count, has_next_cursor,
 * next_cursor (chained into the next step), and first_id/last_id for
 * diagnostic visibility when a step fails. The harness doesn't assert on
 * record contents; the contract verified here is "pagination produces the
 * right page boundaries," not "the right rows are seeded" (which is a
 * concern of db.ts, not of the pagination mechanic).
 *
 * `search` is passed through so the harness can assert the filtered case,
 * which is the one that cannot be checked by eye: with 100 seeded rows and a
 * page size of 20, a client-side filter and a server-side filter look
 * identical on the first page and diverge only past it.
 */
async function invoke(
  method: string,
  request: Record<string, unknown>,
  client: Client,
): Promise<Outcome> {
  try {
    switch (method) {
      case "listRecords": {
        const r = await listService.listRecords(
          {
            pageSize: (request.pageSize as number) ?? 0,
            cursor: (request.cursor as string) ?? "",
            search: (request.search as string) ?? "",
          },
          client,
        );
        const fields: Record<string, string | number | boolean> = {
          record_count: r.records.length,
          has_next_cursor: r.nextCursor !== "",
          next_cursor: r.nextCursor,
        };
        if (r.records.length > 0) {
          fields.first_id = Number(r.records[0].id);
          fields.last_id = Number(r.records[r.records.length - 1].id);
        }
        return { kind: "ok", fields };
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
    // Untyped exception — surface under the test-driver sentinel.
    return {
      kind: "err",
      code: TEST_DRIVER_ERROR,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
