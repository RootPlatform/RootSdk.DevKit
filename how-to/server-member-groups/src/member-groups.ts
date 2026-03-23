// ============================================================================
// How-To: Member Groups
// SDK: memberGroups.create, .get, .getByName, .delete, .list, .listByIds,
//       .listByResourceId, .listResourceIdsForUserId
//       + instance methods: .addUser, .addUsers, .removeUser, .removeUsers,
//         .addCommunityRole, .addCommunityRoles, .removeCommunityRole,
//         .removeCommunityRoles, .update, .isMember
// Permissions: none (local SQLite service — no manifest permissions needed)
// Events: MemberGroupServiceEvent.MembersAdded, .MembersRemoved,
//         .StateChanged, .UserGroupEmptied
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Member groups are app-level containers of users. Each group combines direct
// users (by ID) and role-based users (anyone holding a referenced community
// role). The union is the effective membership (memberUserIds).
//
// Unlike most SDK services, member groups are backed by local SQLite (not gRPC).
// The MemberGroup entity has mutable instance methods — you call .addUser(),
// .removeUser(), etc. directly on the object, not on the service.
//
// Access: rootServer.memberGroups (NOT rootServer.community.memberGroups).
//
// ============================================================================

import {
  rootServer,
  MemberGroupServiceEvent,
  MemberGroup,
  MemberGroupShort,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeMemberGroups(): void {
  const memberGroups = rootServer.memberGroups;
  const messages = rootServer.community.channelMessages;

  // Member group events — event payload types are not exported from the SDK,
  // so we use TypeScript inference on the callback parameter.
  memberGroups.on(MemberGroupServiceEvent.MembersAdded, onMembersAdded);
  memberGroups.on(MemberGroupServiceEvent.MembersRemoved, onMembersRemoved);
  memberGroups.on(MemberGroupServiceEvent.StateChanged, onStateChanged);
  memberGroups.on(MemberGroupServiceEvent.UserGroupEmptied, onGroupEmptied);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onMemberGroupsCommand);
}

// --- SERVICE OPERATIONS ------------------------------------------------------
// These 8 methods are on rootServer.memberGroups (the service).

// resourceType and resourceId are app-defined strings — use them to organize
// groups by your own taxonomy (e.g., "project"/"proj-123", "feature"/"beta").
// userIds and communityRoleIds set initial membership. Both can be empty arrays.
export async function createMemberGroup(
  resourceType: string,
  resourceId: string,
  name: string,
  userIds: string[],
  communityRoleIds: string[],
): Promise<MemberGroup> {
  return rootServer.memberGroups.create({
    resourceType,
    resourceId,
    name,
    userIds,
    communityRoleIds,
  });
}

// Throws if not found. Returns a cached instance (WeakRef) — if you hold a
// reference, subsequent get() calls return the SAME in-memory object, not a
// fresh DB read. Mutations on one reference are visible on all references.
export async function getMemberGroup(id: string): Promise<MemberGroup> {
  return rootServer.memberGroups.get(id);
}

// Returns undefined if not found (does NOT throw, unlike get()).
// Lookup by the (resourceType, resourceId, name) composite key.
export async function getMemberGroupByName(
  resourceType: string,
  resourceId: string,
  name: string,
): Promise<MemberGroup | undefined> {
  return rootServer.memberGroups.getByName({ resourceType, resourceId, name });
}

export async function deleteMemberGroup(id: string): Promise<void> {
  return rootServer.memberGroups.delete(id);
}

// Returns MemberGroupShort — a minimal type with snake_case fields
// (resource_type, resource_id, community_id) because it comes straight
// from SQLite rows. All other methods return full MemberGroup instances.
export async function listMemberGroups(): Promise<MemberGroupShort[]> {
  return rootServer.memberGroups.list();
}

// Batch get by IDs. Returns full MemberGroup instances.
export async function listMemberGroupsByIds(ids: string[]): Promise<MemberGroup[]> {
  return rootServer.memberGroups.listByIds(ids);
}

// All groups for a specific resource (by type + id).
export async function listMemberGroupsByResourceId(
  resourceType: string,
  resourceId: string,
): Promise<MemberGroup[]> {
  return rootServer.memberGroups.listByResourceId({ resourceType, resourceId });
}

// "Which resources of type X does user Y belong to?"
// Returns resource IDs (not groups). Useful for authorization queries —
// e.g., find all projects a user is a member of.
export async function listResourceIdsForUserId(
  resourceType: string,
  name: string,
  userId: string,
): Promise<string[]> {
  return rootServer.memberGroups.listResourceIdsForUserId(
    { resourceType, name },
    { userId },
  );
}

// --- INSTANCE OPERATIONS -----------------------------------------------------
// These methods are called on MemberGroup objects, not on the service.
// This is unique among all SDK services — other services use request objects.

// Add a single user to the group's direct membership.
export async function addUserToGroup(group: MemberGroup, userId: string): Promise<void> {
  return group.addUser(userId);
}

// Add multiple users at once.
export async function addUsersToGroup(group: MemberGroup, userIds: string[]): Promise<void> {
  return group.addUsers(userIds);
}

// Remove a single user from direct membership.
export async function removeUserFromGroup(group: MemberGroup, userId: string): Promise<void> {
  return group.removeUser(userId);
}

// Remove multiple users at once.
export async function removeUsersFromGroup(group: MemberGroup, userIds: string[]): Promise<void> {
  return group.removeUsers(userIds);
}

// Add a community role — all users holding that role become effective members.
export async function addRoleToGroup(group: MemberGroup, communityRoleId: string): Promise<void> {
  return group.addCommunityRole(communityRoleId);
}

// Add multiple community roles at once.
export async function addRolesToGroup(group: MemberGroup, communityRoleIds: string[]): Promise<void> {
  return group.addCommunityRoles(communityRoleIds);
}

// Remove a community role — its users are no longer effective members
// (unless they're also direct members or hold another referenced role).
export async function removeRoleFromGroup(group: MemberGroup, communityRoleId: string): Promise<void> {
  return group.removeCommunityRole(communityRoleId);
}

// Remove multiple community roles at once.
export async function removeRolesFromGroup(group: MemberGroup, communityRoleIds: string[]): Promise<void> {
  return group.removeCommunityRoles(communityRoleIds);
}

// Atomic replacement — replaces ALL userIds and communityRoleIds at once.
// This is NOT additive. Pass the complete desired state.
export async function updateGroupMembership(
  group: MemberGroup,
  userIds: string[],
  communityRoleIds: string[],
): Promise<void> {
  return group.update({ userIds, communityRoleIds });
}

// Check if a user is an effective member — either directly added or via a
// referenced community role.
export async function checkMembership(group: MemberGroup, userId: string): Promise<boolean> {
  return group.isMember({ userId });
}

// --- COMMAND HANDLER: /server-member-groups -----------------------------------------
// Exercises the full member group lifecycle: create, instance methods, queries, delete.

async function onMemberGroupsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-member-groups")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];
  const senderId = evt.userId;

  try {
    // 1. Create a member group with empty initial membership
    const group = await createMemberGroup(
      "demo", "demo-resource", "test-group", [], [],
    );
    lines.push(
      `✓ created group: id=${group.id} name=${group.name} ` +
      `resourceType=${group.resourceType} resourceId=${group.resourceId}`,
    );

    // 2. Add the command sender as a direct user
    await addUserToGroup(group, senderId);
    lines.push(`✓ addUser: added ${senderId}`);
    lines.push(`  userIds: [${group.userIds.join(", ")}]`);
    lines.push(`  memberUserIds: [${group.memberUserIds.join(", ")}]`);

    // 3. Check membership
    const isMember = await checkMembership(group, senderId);
    lines.push(`✓ isMember(${senderId}): ${isMember}`);

    // 4. List all groups (returns MemberGroupShort with snake_case fields)
    const allGroups = await listMemberGroups();
    const found = allGroups.find((g) => g.id === group.id);
    if (found) {
      lines.push(
        `✓ list: found group — resource_type=${found.resource_type} ` +
        `resource_id=${found.resource_id} name=${found.name}`,
      );
    }

    // 5. Get by name (resourceType + resourceId + name lookup)
    const byName = await getMemberGroupByName("demo", "demo-resource", "test-group");
    lines.push(`✓ getByName: ${byName ? `found id=${byName.id}` : "not found"}`);

    // 6. List by resource ID
    const byResource = await listMemberGroupsByResourceId("demo", "demo-resource");
    lines.push(`✓ listByResourceId: ${byResource.length} group(s) for demo/demo-resource`);

    // 7. List resource IDs for user
    const resourceIds = await listResourceIdsForUserId("demo", "test-group", senderId);
    lines.push(`✓ listResourceIdsForUserId: [${resourceIds.join(", ")}]`);

    // 8. Batch get by IDs
    const byIds = await listMemberGroupsByIds([group.id]);
    lines.push(`✓ listByIds: ${byIds.length} group(s)`);

    // 9. Update membership atomically (replaces all users and roles)
    await updateGroupMembership(group, [senderId], []);
    lines.push(`✓ update: atomically set userIds=[${senderId}], communityRoleIds=[]`);

    // 10. Remove the user
    await removeUserFromGroup(group, senderId);
    lines.push(`✓ removeUser: removed ${senderId}`);
    lines.push(`  memberUserIds now: [${group.memberUserIds.join(", ")}]`);

    // 11. Delete the group
    await deleteMemberGroup(group.id);
    lines.push("✓ deleted group");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err) {
    console.error("Member groups demo error:", err);
    await messages.create({ channelId, content: `Member groups demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// Events fire on the service (rootServer.memberGroups), not on individual instances.
// Payload types are not exported from the SDK — TypeScript infers them from
// the MemberGroupServiceEvents map.

function onMembersAdded(evt: { memberGroup: MemberGroup; userIds: string[] }): void {
  console.log(
    `Members added: group=${evt.memberGroup.id} name="${evt.memberGroup.name}" ` +
    `userIds=[${evt.userIds.join(", ")}]`,
  );
}

function onMembersRemoved(evt: { memberGroup: MemberGroup; userIds: string[] }): void {
  console.log(
    `Members removed: group=${evt.memberGroup.id} name="${evt.memberGroup.name}" ` +
    `userIds=[${evt.userIds.join(", ")}]`,
  );
}

function onStateChanged(evt: { memberGroup: MemberGroup }): void {
  console.log(
    `State changed: group=${evt.memberGroup.id} name="${evt.memberGroup.name}" ` +
    `userIds=[${evt.memberGroup.userIds.join(", ")}] ` +
    `roleIds=[${evt.memberGroup.communityRoleIds.join(", ")}]`,
  );
}

function onGroupEmptied(evt: { memberGroup: MemberGroup }): void {
  console.log(
    `Group emptied: group=${evt.memberGroup.id} name="${evt.memberGroup.name}"`,
  );
}
