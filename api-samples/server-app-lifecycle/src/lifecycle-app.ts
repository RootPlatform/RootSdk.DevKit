// ============================================================================
// API Sample: Lifecycle (App)
// SDK: rootServer.lifecycle.start, .stop
// Permissions: channel.createMessage (for the /server-app-lifecycle command only)
// Events: none
// Works in: Apps only (@rootsdk/server-app)
//           Bots use RootBotLifecycle and RootBotStartState (no channelId).
//           See lifecycle-bot/ for the bot variant.
//           For addService() and custom RPC services, see templates/app/.
// ============================================================================
//
// App-specific lifecycle: start state with channelId, starting/stopping
// callbacks. RootAppStartState has everything RootBotStartState has, plus
// channelId — the Root channel where the app is embedded.
//
// ============================================================================

import {
  rootServer,
  RootAppStartState,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  ChannelGuid,
  RootApiException,
} from "@rootsdk/server-app"; // For bots: import from "@rootsdk/server-bot"

// Module-level reference to the start state captured during onStarting.
// The /server-app-lifecycle command reports this to the channel.
let capturedState: RootAppStartState | undefined;

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeLifecycleApp(state: RootAppStartState): void {
  capturedState = state;

  // Log the start state to console on startup
  logAppStartState(state);

  // Command trigger
  const messages = rootServer.community.channelMessages;
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onLifecycleAppCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Logs every field of RootAppStartState. Called once during startup.
//
// RootAppStartState is a snapshot — it reflects the community at the moment
// the app connects. It is NOT live-updated; use the SDK event subscriptions
// (communityRole.created, communityMember.attach, etc.) for real-time changes.
export function logAppStartState(state: RootAppStartState): void {
  // The community this app is installed in.
  console.log(`communityId: ${state.communityId}`);

  // The Root channel where the app is embedded. Use this to scope messages or
  // UI to the correct channel. Only available in apps — bots receive
  // RootBotStartState which does not include channelId.
  console.log(`channelId: ${state.channelId}`);

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

// Called when the app is shutting down (SIGTERM, SIGINT, or
// rootServer.lifecycle.stop()). Use this for cleanup: close database
// connections, flush caches, cancel timers.
// The platform allows ~15 seconds before forcing the process to exit.
export async function shutdownLifecycleApp(): Promise<void> {
  console.log("Stopping: cleanup started");
  // Example: await db.close();
  // Example: clearInterval(pollingTimer);
  console.log("Stopping: cleanup complete");
}

// --- COMMAND HANDLER: /server-app-lifecycle -----------------------------------------
// Reports the start state captured during onStarting. This is a thin handler
// to make the app testable — the real value is in the startup/shutdown flow
// and the channelId field that distinguishes apps from bots.

async function onLifecycleAppCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-app-lifecycle")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  if (!capturedState) {
    lines.push("\u2717 start state not available");
    await messages.create({ channelId, content: lines.join("\n") });
    return;
  }

  const state: RootAppStartState = capturedState;

  // 1. Channel ID — the app-only field
  lines.push(`\u2713 channelId: ${state.channelId}`);

  // 2. Community ID
  lines.push(`\u2713 communityId: ${state.communityId}`);

  // 3. Roles
  const roleNames: string[] = [...state.communityRoles.values()].map((r) => r.name);
  lines.push(
    `\u2713 communityRoles: ${state.communityRoles.size} role(s)` +
    (roleNames.length > 0 ? ` \u2014 ${roleNames.join(", ")}` : ""),
  );

  // 4. Members
  lines.push(`\u2713 communityMembers: ${state.communityMembers.size} member(s)`);

  // 5. Global settings
  lines.push(
    `\u2713 globalSettings: ${state.globalSettings ? "available" : "not configured"}`,
  );

  try {
    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      console.error("Lifecycle app command error:", err.errorCode);
    } else if (err instanceof Error) {
      console.error("Lifecycle app command error:", err.message);
    }
  }
}
