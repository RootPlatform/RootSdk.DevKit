// ============================================================================
// How-To: App Logs
// SDK: dataStore.logs.community.create
// Permissions: none (logging is always available to your code)
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
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- OPERATIONS --------------------------------------------------------------

// Write an Info-level log entry.
// Message cannot be empty or whitespace-only.
export async function logInfo(message: string): Promise<void> {
  await rootServer.dataStore.logs.community.create({
    communityAppLogType: CommunityAppLogType.Info,
    message,
  });
}

// Write a Warn-level log entry.
export async function logWarn(message: string): Promise<void> {
  await rootServer.dataStore.logs.community.create({
    communityAppLogType: CommunityAppLogType.Warn,
    message,
  });
}

// Write an Error-level log entry.
export async function logError(message: string): Promise<void> {
  await rootServer.dataStore.logs.community.create({
    communityAppLogType: CommunityAppLogType.Error,
    message,
  });
}

// Write a Fatal-level log entry.
export async function logFatal(message: string): Promise<void> {
  await rootServer.dataStore.logs.community.create({
    communityAppLogType: CommunityAppLogType.Fatal,
    message,
  });
}
