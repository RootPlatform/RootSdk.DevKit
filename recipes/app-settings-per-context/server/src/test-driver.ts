// ============================================================================
// TEST DRIVER — exercises ChannelConfigsService from a slash command.
//
// THIS FILE IS TEST INFRASTRUCTURE, NOT PART OF THE RECIPE'S LESSON.
// If you're forking this recipe, **delete this file** and the line in main.ts
// that calls `initializeTestDriver()`. Production recipes should never expose
// a self-test command.
//
// Same protocol as the prior recipes' drivers:
//   /test-app-settings-per-context <method> <userIds> [<base64-json-request>]
//
// List responses are flattened into summary fields (config_count,
// first_channel_id, first_enabled, first_priority, last_channel_id, ...).
// Mutation responses surface the saved row's fields directly
// (config_channel_id, config_enabled, config_priority).
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
import { channelConfigsService } from "./channel-configs-service";

const COMMAND = "/test-app-settings-per-context";

// Test-driver internal-error sentinel. Positive (matching the convention
// that negative values are reserved for built-in SDK errors) and well
// outside any recipe's error enum range so it can't collide with a real
// domain code. Test-only — recipe forks delete this whole file.
const TEST_DRIVER_ERROR = 999;

// Captured at startup so synthetic Client objects below have a community
// to claim. The id isn't used for routing — RPC dispatch goes through the
// service singleton — but the Client field is required by the type. The
// existence check at request time is purely defensive against a startup
// ordering bug (driver fires before initializeTestDriver ran).
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

interface ChannelConfigWire {
  channelId: string;
  enabled: boolean;
  priority: number;
  updatedAt: string;
}

/** Flatten a list-shaped response into summary fields. */
function summarizeList(
  configs: ChannelConfigWire[],
): Record<string, string | number | boolean> {
  const fields: Record<string, string | number | boolean> = {
    config_count: configs.length,
  };
  if (configs.length > 0) {
    const first = configs[0];
    const last = configs[configs.length - 1];
    fields.first_channel_id = first.channelId;
    fields.first_enabled = first.enabled;
    fields.first_priority = first.priority;
    fields.last_channel_id = last.channelId;
    fields.last_enabled = last.enabled;
    fields.last_priority = last.priority;
  }
  return fields;
}

/** Flatten a single-row response (Upsert) into config_* fields. */
function summarizeRow(
  config: ChannelConfigWire,
): Record<string, string | number | boolean> {
  return {
    config_channel_id: config.channelId,
    config_enabled: config.enabled,
    config_priority: config.priority,
  };
}

async function invoke(
  method: string,
  request: Record<string, unknown>,
  client: Client,
): Promise<Outcome> {
  try {
    switch (method) {
      case "listChannelConfigs": {
        const r = await channelConfigsService.listChannelConfigs({}, client);
        return {
          kind: "ok",
          fields: {
            ...summarizeList((r.configs ?? []) as ChannelConfigWire[]),
            is_admin: r.isAdmin,
          },
        };
      }
      case "upsertChannelConfig": {
        const r = await channelConfigsService.upsertChannelConfig(
          {
            channelId: (request.channelId as string) ?? "",
            enabled: (request.enabled as boolean) ?? false,
            priority: (request.priority as number) ?? 0,
          },
          client,
        );
        if (!r.config) {
          return {
            kind: "err",
            code: TEST_DRIVER_ERROR,
            message: "upsert returned no config",
          };
        }
        return {
          kind: "ok",
          fields: summarizeRow(r.config as ChannelConfigWire),
        };
      }
      case "deleteChannelConfig": {
        await channelConfigsService.deleteChannelConfig(
          { channelId: (request.channelId as string) ?? "" },
          client,
        );
        return { kind: "ok", fields: { deleted: true } };
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
