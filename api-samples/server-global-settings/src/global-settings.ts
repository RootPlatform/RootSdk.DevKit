// ============================================================================
// API Sample: Global Settings
// SDK: rootServer.globalSettings, state.globalSettings
// Permissions: channel.createMessage (to post results)
// Events: GlobalSettingsUpdateEvent (settings.on('update', ...))
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Global settings are configuration defined in root-manifest.json. Community
// admins edit them through the Root platform UI. Read values at startup
// (state.globalSettings) or at runtime (rootServer.globalSettings) and
// subscribe to changes via the 'update' event.
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
// Reading values: indexing into rootServer.globalSettings returns a
// GlobalSetting — the union of every leaf type above. The manifest is the
// contract: your code knows which leaf type it declared, so cast to it
// directly.
//
//   const vip = rootServer.globalSettings?.general?.vipMembers as
//     ReadOnlyMemberGroup | undefined;
//
// The `?.` chains cover (a) no settings block in the manifest and (b) admin
// hasn't configured this item yet.
//
// This api sample demonstrates the roleOrMember picker. New sections will be
// added as more types become available on the platform.
//
// ============================================================================

import {
  rootServer,
  RootBotStartState,
  GlobalSettingsUpdateEvent,
  ReadOnlyMemberGroup,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  UserGuid,
  ChannelGuid,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// In real code you'd get the userId from whatever event you're handling —
// we just grab any community member at startup to demonstrate the call shape.
let firstMemberId: UserGuid | undefined;

// ── SUBSCRIBE ────────────────────────────────────────────────────────────────

export function initializeGlobalSettings(state: RootBotStartState): void {
  firstMemberId = [...state.communityMembers.keys()][0];

  // Read at startup. state.globalSettings is the same object
  // rootServer.globalSettings returns at runtime — it's just provided on the
  // start state so you can read it inside onStarting before any event fires.
  const startupVip = state.globalSettings?.general?.vipMembers as
    | ReadOnlyMemberGroup
    | undefined;
  console.log(
    `[global-settings] startup vipMembers: ${
      startupVip?.memberUserIds.length ?? 0
    } member(s)`,
  );

  // Subscribe to settings changes. The platform fires this event when a
  // community admin edits settings through the UI.
  // TODO(SDK): GlobalSettingsEvent enum unreleased — swap "update" →
  // GlobalSettingsEvent.Update once it ships (same value, enum-clean).
  state.globalSettings?.on("update", onSettingsUpdate);

  // Command trigger
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onGlobalSettingsCommand,
  );
}

// ── UPDATE EVENT ─────────────────────────────────────────────────────────────

// The update event provides both previous and current settings as full
// snapshots (not deltas) so you can diff exactly what changed.
function onSettingsUpdate(event: GlobalSettingsUpdateEvent): void {
  const prev = event.previous?.general?.vipMembers as
    | ReadOnlyMemberGroup
    | undefined;
  const curr = event.current?.general?.vipMembers as
    | ReadOnlyMemberGroup
    | undefined;
  console.log(
    `[global-settings] vipMembers updated for ${event.communityId}: ${
      prev?.memberUserIds.length ?? 0
    } → ${curr?.memberUserIds.length ?? 0}`,
  );
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
    // Read at runtime. Cast to the leaf type the manifest declared — the
    // SDK's index signature returns GlobalSetting (a union), and we know
    // this slot is a roleOrMember because that's what root-manifest.json
    // says.
    //
    // ReadOnlyMemberGroup combines direct users and role-based members:
    //   .userIds           — directly assigned user IDs
    //   .communityRoleIds  — assigned role IDs
    //   .memberUserIds     — effective membership (users + role members)
    //
    // The selectBehavior in root-manifest.json controls the UI picker:
    //   "user"                  — single user
    //   "users"                 — multiple users
    //   "role"                  — single role
    //   "roles"                 — multiple roles
    //   "roleMultiAndUserMulti" — multiple roles and users (most common)
    const vipGroup = rootServer.globalSettings?.general?.vipMembers as
      | ReadOnlyMemberGroup
      | undefined;

    if (!vipGroup) {
      await messages.create({
        channelId,
        content:
          "general.vipMembers is empty — select users or roles in the app settings UI, then run /server-global-settings again.",
      });
      return;
    }

    lines.push(
      `✓ roleOrMember: id=${vipGroup.id}, ` +
        `userIds=[${vipGroup.userIds.join(", ")}], ` +
        `communityRoleIds=[${vipGroup.communityRoleIds.join(", ")}], ` +
        `memberUserIds=[${vipGroup.memberUserIds.join(", ")}]`,
    );

    // isMember() checks effective membership (direct users + role members).
    // Pass an object with a userId string — typically from an event payload.
    if (firstMemberId) {
      const isMember = await vipGroup.isMember({ userId: firstMemberId });
      lines.push(`✓ isMember(${firstMemberId}): ${isMember}`);
    } else {
      lines.push("✓ isMember: no community members to check");
    }

    lines.push(
      "✓ update event: subscribed (fires when an admin edits settings)",
    );

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts: string[] = [];
    if (err instanceof RootApiException) {
      parts.push(`Global settings demo error: ${err.errorCode}`);
      if (err.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    } else if (err instanceof Error) {
      parts.push(`Global settings demo error: ${err.message}`);
    }
    await messages.create({ channelId, content: parts.join("\n") });
  }
}
