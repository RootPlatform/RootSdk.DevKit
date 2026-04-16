// ============================================================================
// How-To: Global Settings
// SDK: rootServer.globalSettings, state.globalSettings
// Permissions: channel.createMessage (to post results)
// Events: GlobalSettingsUpdateEvent (settings.on('update', ...))
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Global settings are configuration defined in root-manifest.json. Community
// admins edit them through the Root platform UI. The app reads values at
// startup (state.globalSettings) or at runtime (rootServer.globalSettings)
// and subscribes to changes via the 'update' event.
//
// Settings are organized as groups → items. Each item has a type:
//
//   Type              TypeScript value                  Platform status
//   ─────────────────────────────────────────────────────────────────────
//   roleOrMember      ReadOnlyMemberGroup               ✅ implemented
//   text              string | undefined                 coming soon
//   number            number | undefined                 coming soon
//   checkbox          boolean                            coming soon
//   channel           ChannelGuid[]                      coming soon
//   channelGroup      ChannelGroupGuid[]                 coming soon
//   select            string[]                           coming soon
//   timestamp         Date | undefined                   coming soon
//   time              { hours, minutes, seconds }        coming soon
//   date              { year, month, day }               coming soon
//   color             string | undefined                 coming soon
//
// This how-to demonstrates the roleOrMember picker. New sections will be
// added as more types become available on the platform.
//
// ============================================================================

import {
  rootServer,
  RootBotStartState,
  GlobalSettings,
  GlobalSettingsUpdateEvent,
  ReadOnlyMemberGroup,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  UserGuid,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// Capture startup state for use in the command handler
let startupSettings: GlobalSettings | undefined;
let firstMemberId: UserGuid | undefined;

// ── SUBSCRIBE ────────────────────────────────────────────────────────────────

export function initializeGlobalSettings(state: RootBotStartState): void {
  const messages = rootServer.community.channelMessages;

  // Settings are available on the start state. This is the same object as
  // rootServer.globalSettings — just provided earlier for convenience.
  startupSettings = state.globalSettings;

  // Capture a member ID for the isMember() check later
  firstMemberId = [...state.communityMembers.keys()][0];

  // Subscribe to settings changes. The platform fires this event when a
  // community admin edits settings through the UI.
  if (startupSettings) {
    startupSettings.on("update", onSettingsUpdate);
  }

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onGlobalSettingsCommand);
}

// ── UPDATE EVENT ─────────────────────────────────────────────────────────────

// The update event provides both previous and current settings so you can
// diff the changes. Both are full GlobalSettings snapshots — not deltas.
function onSettingsUpdate(event: GlobalSettingsUpdateEvent): void {
  console.log(
    `[global-settings] Settings updated for community ${event.communityId}`,
  );

  // Example: detect when vipMembers changed
  const prev = event.previous?.["general"]?.["vipMembers"] as
    | ReadOnlyMemberGroup
    | undefined;
  const curr = event.current?.["general"]?.["vipMembers"] as
    | ReadOnlyMemberGroup
    | undefined;

  if (prev && curr) {
    console.log(
      `[global-settings] VIP members: ${prev.memberUserIds.length} → ${curr.memberUserIds.length}`,
    );
  }
}

// ── COMMAND HANDLER ──────────────────────────────────────────────────────────

async function onGlobalSettingsCommand(
  evt: ChannelMessageCreatedEvent,
): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-global-settings")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // ── roleOrMember picker ───────────────────────────────────────────

    // 1. Read settings at startup
    //    Settings are provided on the RootBotStartState / RootAppStartState
    //    object. They're available before the command handler runs.
    if (!startupSettings) {
      await messages.create({
        channelId,
        content: "No global settings configured — skipping all checks.",
      });
      return;
    }
    lines.push("✓ globalSettings available at startup");

    // 2. Read settings at runtime
    //    rootServer.globalSettings returns the current settings object.
    const runtimeSettings = rootServer.globalSettings;
    if (!runtimeSettings) {
      await messages.create({
        channelId,
        content: "rootServer.globalSettings is undefined — skipping.",
      });
      return;
    }
    lines.push("✓ rootServer.globalSettings available at runtime");

    // 3. Read the roleOrMember value
    //    Access by group key → item key. The value is a ReadOnlyMemberGroup.
    //    ReadOnlyMemberGroup combines direct users and role-based members:
    //      .userIds           — directly assigned user IDs
    //      .communityRoleIds  — assigned role IDs
    //      .memberUserIds     — effective membership (users + role members)
    //
    //    The selectBehavior in root-manifest.json controls the UI picker:
    //      "user"                  — single user
    //      "users"                 — multiple users
    //      "role"                  — single role
    //      "roles"                 — multiple roles
    //      "roleMultiAndUserMulti" — multiple roles and users (most common)
    const vipGroup = runtimeSettings["general"]?.["vipMembers"] as
      | ReadOnlyMemberGroup
      | undefined;

    if (!vipGroup) {
      await messages.create({
        channelId,
        content:
          "Settings configured but general.vipMembers is empty — " +
          "select users or roles in the app settings UI.",
      });
      return;
    }

    lines.push(
      `✓ roleOrMember: id=${vipGroup.id}, ` +
        `userIds=[${vipGroup.userIds.join(", ")}], ` +
        `communityRoleIds=[${vipGroup.communityRoleIds.join(", ")}], ` +
        `memberUserIds=[${vipGroup.memberUserIds.join(", ")}]`,
    );

    // 4. Check membership
    //    isMember() checks effective membership (direct users + role members).
    //    Pass an object with a userId string — typically from an event payload.
    if (firstMemberId) {
      const isMember = await vipGroup.isMember({ userId: firstMemberId });
      lines.push(`✓ isMember(${firstMemberId}): ${isMember}`);
    } else {
      lines.push("✓ isMember: no community members to check");
    }

    // 5. Verify update event subscription
    //    We subscribed in initializeGlobalSettings(). The event fires when
    //    an admin changes settings — it won't fire during this test, but
    //    we verify the subscription is active.
    lines.push("✓ update event: subscribed");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    console.error("Global settings demo error:", err);
    await messages.create({
      channelId,
      content: `Global settings demo error: ${err}`,
    });
  }
}
