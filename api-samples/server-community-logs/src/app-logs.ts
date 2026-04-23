// ============================================================================
// API Sample: App Logs
// SDK: dataStore.logs.community.create
// Permissions: channel.createMessage (to reply with results)
// Events: none
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// App logs are structured log entries sent to the community.
// Community members with the communityManageApps permission can read them
// in the app's settings in the Root client.
// Use them to record operational events — startup, errors, key actions.
//
// Log levels: Info, Warn, Error, Fatal
// (CommunityAppLogType.Unspecified is rejected by the server.)
//
// Only create is available — get and list are not exposed in the SDK.
// Logs are read in the app's settings in the Root client by community members
// with the communityManageApps permission.
//
// ============================================================================

import {
  rootServer,
  CommunityAppLogType,
  CommunityAppLogCreateRequest,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  ChannelGuid,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeAppLogs(): void {
  const messages = rootServer.community.channelMessages;
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onAppLogsCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Write an Info-level log entry.
// Message cannot be empty or whitespace-only.
export async function logInfo(message: string): Promise<void> {
  const request: CommunityAppLogCreateRequest = {
    communityAppLogType: CommunityAppLogType.Info,
    message,
  };
  await rootServer.dataStore.logs.community.create(request);
}

// Write a Warn-level log entry.
export async function logWarn(message: string): Promise<void> {
  const request: CommunityAppLogCreateRequest = {
    communityAppLogType: CommunityAppLogType.Warn,
    message,
  };
  await rootServer.dataStore.logs.community.create(request);
}

// Write an Error-level log entry.
export async function logError(message: string): Promise<void> {
  const request: CommunityAppLogCreateRequest = {
    communityAppLogType: CommunityAppLogType.Error,
    message,
  };
  await rootServer.dataStore.logs.community.create(request);
}

// Write a Fatal-level log entry.
export async function logFatal(message: string): Promise<void> {
  const request: CommunityAppLogCreateRequest = {
    communityAppLogType: CommunityAppLogType.Fatal,
    message,
  };
  await rootServer.dataStore.logs.community.create(request);
}

// --- COMMAND HANDLER: /server-community-logs ----------------------------------------------
// Writes one log entry at each level, then reports results.

async function onAppLogsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-community-logs")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    await logInfo("Test info log from /app-logs command");
    lines.push("✓ logged Info level");

    await logWarn("Test warn log from /app-logs command");
    lines.push("✓ logged Warn level");

    await logError("Test error log from /app-logs command");
    lines.push("✓ logged Error level");

    await logFatal("Test fatal log from /app-logs command");
    lines.push("✓ logged Fatal level");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts: string[] = [];
    if (err instanceof RootApiException) {
      parts.push(`App logs demo error: ${err.errorCode}`);
    } else if (err instanceof Error) {
      parts.push(`App logs demo error: ${err.message}`);
    }
    if (lines.length > 0) parts.push(`completed ${lines.length}/4 steps`);
    await messages.create({ channelId, content: parts.join("\n") });
  }
}
