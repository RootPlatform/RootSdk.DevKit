// ============================================================================
// How-To: Lifecycle (Bot)
// SDK: rootServer.lifecycle.start, .stop
// Permissions: channel.createMessage (only for the /server-bot-lifecycle command)
// Events: none
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           Apps use RootAppStartState (adds channelId).
//           See lifecycle-app/ for the app variant.
//           For addService() and custom RPC services, see llms/templates/app/.
// ============================================================================
//
// Start and stop the bot, inspect the start state snapshot, and register a
// stopping callback for graceful shutdown. The starting callback receives a
// RootBotStartState with the community's roles, members, and settings at the
// moment the bot connects.
//
// ============================================================================

import {
  rootServer,
  RootBotStartState,
  CommunityGuid,
  CommunityRoleGuid,
  UserGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// Module-level reference to the start state captured during onStarting.
// The /server-bot-lifecycle command reports this to the channel.
let capturedState: RootBotStartState | undefined;

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeLifecycle(state: RootBotStartState): void {
  capturedState = state;

  // Log the start state to console on startup
  logStartState(state);

  // Command trigger
  const messages = rootServer.community.channelMessages;
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onLifecycleCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Logs every field of RootBotStartState. Called once during startup.
//
// RootBotStartState is a snapshot — it reflects the community at the moment
// the bot connects. It is NOT live-updated; use the SDK event subscriptions
// (communityRole.created, communityMember.attach, etc.) for real-time changes.
export function logStartState(state: RootBotStartState): void {
  // The community this bot is installed in.
  console.log(`communityId: ${state.communityId}`);

  // All roles defined in the community (Map<CommunityRoleGuid, { id, name }>).
  console.log(`communityRoles: ${state.communityRoles.size} role(s)`);
  for (const [roleId, role] of state.communityRoles) {
    console.log(`  role: id=${roleId} name=${role.name}`);
  }

  // All members and their assigned roles (Map<UserGuid, Set<CommunityRoleGuid>>).
  console.log(`communityMembers: ${state.communityMembers.size} member(s)`);
  for (const [userId, roleIds] of state.communityMembers) {
    const roles = [...roleIds].join(", ") || "none";
    console.log(`  member: userId=${userId} roles=[${roles}]`);
  }

  // The app's global settings, if configured by a community admin.
  // undefined when no settings are defined in root-manifest.json.
  console.log(
    `globalSettings: ${state.globalSettings ? "available" : "not configured"}`,
  );
}

// Called when the bot is shutting down (SIGTERM, SIGINT, or rootServer.lifecycle.stop()).
// Use this for cleanup: close database connections, flush caches, cancel timers.
// The platform allows ~15 seconds before forcing the process to exit.
export async function shutdownLifecycle(): Promise<void> {
  console.log("Stopping: cleanup started");
  // Example: await db.close();
  // Example: clearInterval(pollingTimer);
  console.log("Stopping: cleanup complete");
}

// --- COMMAND HANDLER: /server-bot-lifecycle ---------------------------------------------
// Reports the start state captured during onStarting. This is a thin handler
// to make the bot testable — the real value is in the startup/shutdown flow.

async function onLifecycleCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-bot-lifecycle")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  if (!capturedState) {
    lines.push("\u2717 start state not available");
    await messages.create({ channelId, content: lines.join("\n") });
    return;
  }

  const state = capturedState;

  // 1. Community ID
  lines.push(`\u2713 communityId: ${state.communityId}`);

  // 2. Roles
  const roleNames = [...state.communityRoles.values()].map((r) => r.name);
  lines.push(
    `\u2713 communityRoles: ${state.communityRoles.size} role(s)` +
    (roleNames.length > 0 ? ` — ${roleNames.join(", ")}` : ""),
  );

  // 3. Members
  lines.push(`\u2713 communityMembers: ${state.communityMembers.size} member(s)`);

  // 4. Global settings
  lines.push(
    `\u2713 globalSettings: ${state.globalSettings ? "available" : "not configured"}`,
  );

  // 5. Stopping callback
  lines.push("\u2713 stoppingCallback: registered");

  await messages.create({ channelId, content: lines.join("\n") });
}
