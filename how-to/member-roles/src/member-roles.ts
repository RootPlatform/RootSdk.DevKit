// ============================================================================
// How-To: Member Roles
// SDK: communityMemberRoles.add, .list, .remove, .setPrimary
// Permissions: community.manageRoles
// Events: CommunityMemberRoleEvent.CommunityMemberRoleCreated,
//         .CommunityMemberRoleDeleted, .CommunityMemberRoleSetPrimary
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Add, list, remove, and set primary roles on community members.
// Roles are defined in the roles/ how-to; this how-to assigns them.
//
// ============================================================================

import {
  rootServer,
  CommunityRoleGuid,
  UserGuid,
  CommunityMemberRoleAddRequest,
  CommunityMemberRoleListRequest,
  CommunityMemberRoleListResponse,
  CommunityMemberRoleRemoveRequest,
  CommunityMemberRoleSetPrimaryRequest,
  CommunityMemberRoleEvent,
  CommunityMemberRoleCreatedEvent,
  CommunityMemberRoleDeletedEvent,
  CommunityMemberRoleSetPrimaryEvent,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeMemberRoles(): void {
  const memberRoles = rootServer.community.communityMemberRoles;
  const messages = rootServer.community.channelMessages;

  // Member role events
  memberRoles.on(CommunityMemberRoleEvent.CommunityMemberRoleCreated, onMemberRoleAdded);
  memberRoles.on(CommunityMemberRoleEvent.CommunityMemberRoleDeleted, onMemberRoleRemoved);
  memberRoles.on(CommunityMemberRoleEvent.CommunityMemberRoleSetPrimary, onMemberRolePrimarySet);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onMemberRolesCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// add() assigns a role to one or more users. This is an all-or-nothing operation:
// if any userId is not a community member, the entire request fails.
// userIds must contain at least one entry.
// Requires manageRoles permission on the community.
export async function addMemberRole(
  communityRoleId: CommunityRoleGuid,
  userIds: UserGuid[],
): Promise<void> {
  const request: CommunityMemberRoleAddRequest = { communityRoleId, userIds };
  return rootServer.community.communityMemberRoles.add(request);
}

// list() returns all role IDs assigned to a specific user.
// The response always includes the EveryoneRole — every member implicitly has it.
// The primary role (if set) appears at index [0] of communityRoleIds.
// No permissions required.
export async function listMemberRoles(
  userId: UserGuid,
): Promise<CommunityMemberRoleListResponse> {
  const request: CommunityMemberRoleListRequest = { userId };
  return rootServer.community.communityMemberRoles.list(request);
}

// remove() unassigns a role from one or more users. Forgiving: silently skips
// users who don't have the role (no error).
// userIds must contain at least one entry.
// Requires manageRoles permission on the community.
export async function removeMemberRole(
  communityRoleId: CommunityRoleGuid,
  userIds: UserGuid[],
): Promise<void> {
  const request: CommunityMemberRoleRemoveRequest = { communityRoleId, userIds };
  return rootServer.community.communityMemberRoles.remove(request);
}

// setPrimary() makes a role the user's primary role, moving it to the first
// position in their role list. The user must already have the role assigned.
// Requires manageRoles permission on the community.
export async function setMemberPrimaryRole(
  userId: UserGuid,
  communityRoleId: CommunityRoleGuid,
): Promise<void> {
  const request: CommunityMemberRoleSetPrimaryRequest = { userId, communityRoleId };
  return rootServer.community.communityMemberRoles.setPrimary(request);
}

// --- COMMAND HANDLER: /member-roles ------------------------------------------
// Exercises the full member role lifecycle: add, list, setPrimary, remove.

async function onMemberRolesCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/member-roles")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Get roles and members to work with
    const roles = await rootServer.community.communityRoles.list();
    if (roles.length < 2) {
      await messages.create({ channelId, content: "Need at least 2 roles. Create some first via /roles." });
      return;
    }
    const members = await rootServer.community.communityMembers.listAll();
    if (members.length === 0) {
      await messages.create({ channelId, content: "No members found." });
      return;
    }

    const role1 = roles[0];
    const role2 = roles[1];
    const member = members[0];
    const userId = member.userId;
    lines.push(`\u2713 using roles: ${role1.name}, ${role2.name}`);
    lines.push(`\u2713 using member: ${member.nickname ?? userId}`);

    // 2. List current roles for the member
    const before = await listMemberRoles(userId);
    lines.push(`\u2713 member has ${before.communityRoleIds?.length ?? 0} role(s) before`);

    // 3. Add two roles to the member
    await addMemberRole(role1.id, [userId]);
    await addMemberRole(role2.id, [userId]);
    lines.push(`\u2713 added roles: ${role1.name}, ${role2.name}`);

    // 4. List roles — verify both are present
    const after = await listMemberRoles(userId);
    lines.push(`\u2713 member now has ${after.communityRoleIds?.length ?? 0} role(s)`);

    // 5. Set the second role as primary — moves it to index [0]
    await setMemberPrimaryRole(userId, role2.id);
    const withPrimary = await listMemberRoles(userId);
    const primaryId = withPrimary.communityRoleIds?.[0];
    lines.push(`\u2713 set primary role: ${role2.name} (first in list: ${primaryId === role2.id})`);

    // 6. Remove both roles
    await removeMemberRole(role1.id, [userId]);
    await removeMemberRole(role2.id, [userId]);
    lines.push("\u2713 removed both roles");

    // 7. List roles — verify they're gone (EveryoneRole remains)
    const final = await listMemberRoles(userId);
    lines.push(`\u2713 member now has ${final.communityRoleIds?.length ?? 0} role(s) (EveryoneRole always present)`);

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err) {
    console.error("Member roles demo error:", err);
    await messages.create({ channelId, content: `Member roles demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL member role changes from any source.

function onMemberRoleAdded(evt: CommunityMemberRoleCreatedEvent): void {
  console.log(
    `Member role added: roleId=${evt.communityRoleId} userIds=[${evt.userIds.join(", ")}]`,
  );
}

function onMemberRoleRemoved(evt: CommunityMemberRoleDeletedEvent): void {
  console.log(
    `Member role removed: roleId=${evt.communityRoleId} userIds=[${evt.userIds.join(", ")}]`,
  );
}

function onMemberRolePrimarySet(evt: CommunityMemberRoleSetPrimaryEvent): void {
  console.log(
    `Member role primary set: userId=${evt.userId} roleId=${evt.communityRoleId}`,
  );
}
