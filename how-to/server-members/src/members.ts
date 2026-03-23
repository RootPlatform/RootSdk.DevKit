// ============================================================================
// How-To: Members
// SDK: communityMembers.get, .list, .listAll
// Permissions: None
// Events: CommunityMemberEvent.UserSetProfile, .CommunityMemberAttach,
//         .CommunityMemberDetach
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Get, list, and list all community members. This is a read-only client —
// there are no create, edit, or delete operations. Members join via invites
// and leave via kick/ban.
//
// ============================================================================

import {
  rootServer,
  CommunityMember,
  CommunityMemberGetRequest,
  CommunityMemberListRequest,
  CommunityMemberEvent,
  UserSetProfileEvent,
  CommunityMemberAttachEvent,
  CommunityMemberDetachEvent,
  UserGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeMembers(): void {
  const members = rootServer.community.communityMembers;
  const messages = rootServer.community.channelMessages;

  // Member events
  members.on(CommunityMemberEvent.UserSetProfile, onUserSetProfile);
  members.on(CommunityMemberEvent.CommunityMemberAttach, onMemberAttach);
  members.on(CommunityMemberEvent.CommunityMemberDetach, onMemberDetach);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onMembersCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Returns a single member by userId. Throws if the user is not a community member.
// No permissions required.
export async function getMember(userId: UserGuid): Promise<CommunityMember> {
  const request: CommunityMemberGetRequest = { userId };
  return rootServer.community.communityMembers.get(request);
}

// Returns members matching the given userIds. Non-existent userIds are silently
// filtered out — no error is thrown for missing users. The returned array may be
// shorter than the input array.
// userIds must contain at least one entry.
// No permissions required.
export async function listMembers(userIds: UserGuid[]): Promise<CommunityMember[]> {
  const request: CommunityMemberListRequest = { userIds };
  return rootServer.community.communityMembers.list(request);
}

// Returns all members in the community, including app users and the community owner.
// No parameters needed.
// No permissions required.
export async function listAllMembers(): Promise<CommunityMember[]> {
  return rootServer.community.communityMembers.listAll();
}

// --- COMMAND HANDLER: /server-members -----------------------------------------------
// Exercises all three member query methods.

async function onMembersCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-members")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List all members in the community
    const all = await listAllMembers();
    lines.push(`\u2713 listAll: ${all.length} member(s) in community`);

    if (all.length === 0) {
      await messages.create({ channelId, content: "No members found." });
      return;
    }

    // 2. Get a single member by ID
    const first = all[0];
    const member = await getMember(first.userId);
    lines.push(
      `\u2713 get: nickname=${member.nickname} roles=${member.communityRoleIds?.length ?? 0} ` +
      `primary=${member.primaryCommunityRoleName ?? "none"}`,
    );

    // 3. List specific members by userIds
    const userIds = all.slice(0, Math.min(3, all.length)).map((m) => m.userId);
    const subset = await listMembers(userIds);
    lines.push(`\u2713 list: requested ${userIds.length}, got ${subset.length} member(s)`);

    // 4. Show member fields available
    lines.push(
      `\u2713 member fields: userId, nickname, profilePictureAssetUri, communityRoleIds, ` +
      `roleColorHex, primaryCommunityRoleId, primaryCommunityRoleName, subscribedAt`,
    );

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err) {
    console.error("Members demo error:", err);
    await messages.create({ channelId, content: `Members demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for member presence and profile changes.

// Fires when any user updates their profile (username, picture).
// This is a global event — not scoped to the community.
function onUserSetProfile(evt: UserSetProfileEvent): void {
  console.log(
    `User profile updated: userId=${evt.userId} username=${evt.username} ` +
    `picture=${evt.profilePictureAssetUri}`,
  );
}

// Fires when a member opens the community on a device.
// If a member has multiple devices, this fires for each one.
function onMemberAttach(evt: CommunityMemberAttachEvent): void {
  console.log(
    `Member attached: userId=${evt.userId} onlineStatus=${evt.onlineStatus}`,
  );
}

// Fires when a member closes the community on a device.
// Only broadcasts when the member's last device disconnects.
function onMemberDetach(evt: CommunityMemberDetachEvent): void {
  console.log(`Member detached: userId=${evt.userId}`);
}
