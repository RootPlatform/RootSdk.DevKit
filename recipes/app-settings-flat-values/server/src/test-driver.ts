// ============================================================================
// TEST DRIVER — exercises SettingsService from a slash command.
//
// THIS FILE IS TEST INFRASTRUCTURE, NOT PART OF THE RECIPE'S LESSON.
// If you're forking this recipe, **delete this file** and the line in main.ts
// that calls `initializeTestDriver()`. Production recipes should never expose
// a self-test command.
//
// Same pattern as the prior recipes' drivers:
//   /test-app-settings-flat-values <method> <userIds> [<base64-json-request>]
//
// Per-user, emit `✓ key=value` lines on success or `✗ error_code=<n>` /
// `✗ error_message=<text>` on a typed RootServerException.
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
import { settingsService } from "./settings-service";

const COMMAND = "/test-app-settings-flat-values";

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

/**
 * Dispatch one RPC by name, flatten the response into key=value fields the
 * harness can match against `expectedResponse`. SettingsValues' three flat
 * primitives flatten cleanly; the harness asserts on whichever subset it
 * cares about.
 */
async function invoke(
  method: string,
  request: Record<string, unknown>,
  client: Client,
): Promise<Outcome> {
  try {
    switch (method) {
      case "getSettings": {
        const r = await settingsService.getSettings({}, client);
        return {
          kind: "ok",
          fields: {
            welcome_message: r.values?.welcomeMessage ?? "",
            max_items: r.values?.maxItems ?? 0,
            show_timestamps: r.values?.showTimestamps ?? false,
            is_admin: r.isAdmin,
          },
        };
      }
      case "updateSettings": {
        const r = await settingsService.updateSettings(
          {
            welcomeMessage: request.welcomeMessage as string | undefined,
            maxItems: request.maxItems as number | undefined,
            showTimestamps: request.showTimestamps as boolean | undefined,
          },
          client,
        );
        return {
          kind: "ok",
          fields: {
            welcome_message: r.values?.welcomeMessage ?? "",
            max_items: r.values?.maxItems ?? 0,
            show_timestamps: r.values?.showTimestamps ?? false,
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
