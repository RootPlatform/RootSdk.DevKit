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
  CommunityRole,
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
  WellKnownRootGuids,
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

// --- COMMAND HANDLER: /server-member-roles [roleId] ---------------------------------
// Exercises the full member role lifecycle: add, list, setPrimary, remove.
// Pass a roleId to target a specific role, or omit to auto-select.

async function onMemberRolesCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-member-roles")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];
  let step = 0;

  try {
    // 1. Get roles and members to work with
    // Filter out the Everyone role — it's implicit and can't be manually assigned/removed.
    // Note: add() can only assign roles whose permissions are a subset of the bot's own.
    const allRoles: CommunityRole[] = await rootServer.community.communityRoles.list();
    const everyoneId = WellKnownRootGuids.CommunityRoles.EveryoneRole;
    const roles: CommunityRole[] = allRoles.filter((r) => r.id !== everyoneId);
    if (roles.length < 1) {
      await messages.create({ channelId, content: "Need at least 1 assignable role. Create one first via /server-roles." });
      return;
    }

    // Accept an optional roleId argument: /server-member-roles <roleId>
    // If provided, use that specific role. Otherwise fall back to the last
    // non-Everyone role (built-in roles like Admin appear first and may have
    // permissions that exceed the bot's own, making them unassignable).
    const roleIdArg = content.replace("/server-member-roles", "").trim();
    let role: CommunityRole;
    if (roleIdArg) {
      const match: CommunityRole | undefined = roles.find((r) => r.id === roleIdArg);
      if (!match) {
        await messages.create({
          channelId,
          content: `Role not found: ${roleIdArg}\nAvailable: ${roles.map(r => `${r.name} (${r.id})`).join(", ")}`,
        });
        return;
      }
      role = match;
    } else {
      role = roles[roles.length - 1];
    }
    // Use the message sender as the target member
    const userId = evt.userId;
    lines.push(`\u2713 using role: ${role.name} (${role.id})`);
    lines.push(`\u2713 using member: ${userId}`);

    // 2. List current roles for the member
    const before: CommunityMemberRoleListResponse = await listMemberRoles(userId);
    lines.push(`\u2713 member has ${before.communityRoleIds?.length ?? 0} role(s) before`);

    // 3. Add the role to the member
    step = 3;
    await addMemberRole(role.id, [userId]);
    lines.push(`\u2713 added role: ${role.name}`);

    // 4. List roles — verify it's present
    const after: CommunityMemberRoleListResponse = await listMemberRoles(userId);
    lines.push(`\u2713 member now has ${after.communityRoleIds?.length ?? 0} role(s)`);

    // 5. Set the role as primary — moves it to index [0]
    step = 5;
    await setMemberPrimaryRole(userId, role.id);
    const withPrimary: CommunityMemberRoleListResponse = await listMemberRoles(userId);
    const primaryId: CommunityRoleGuid | undefined = withPrimary.communityRoleIds?.[0];
    lines.push(`\u2713 set primary role: ${role.name} (first in list: ${primaryId === role.id})`);

    // 6. Remove the role
    step = 6;
    await removeMemberRole(role.id, [userId]);
    lines.push("\u2713 removed role");

    // 7. List roles — verify it's gone (EveryoneRole remains)
    const final: CommunityMemberRoleListResponse = await listMemberRoles(userId);
    lines.push(`\u2713 member now has ${final.communityRoleIds?.length ?? 0} role(s) (EveryoneRole always present)`);

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts = [`Member roles demo error: ${err}`];
    if (err && typeof err === "object" && "errorCode" in err) {
      parts.push(`errorCode: ${(err as Record<string, unknown>).errorCode}`);
    }
    if (lines.length > 0) parts.push(`completed ${lines.length}/8 steps`);
    console.error("Member roles demo error:", err);
    await messages.create({ channelId, content: parts.join("\n") });
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
