// ============================================================================
// How-To: Access Rules
// SDK: accessRules.create, .edit, .update, .get, .delete,
//       .listByChannelOrChannelGroup, .listByRoleOrMember
// Permissions: channel.fullControl
// Events: None (access rule changes surface as channel/channelGroup events)
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Create, edit, update (batch), get, delete, and list access rules.
// Access rules grant or deny per-channel permissions to specific roles or
// members, overriding the channel/group defaults.
//
// All mutation methods (create, edit, update, delete) accept an optional
// eventHandlers parameter for permission update side effects — see the
// channels/ how-to for a full explanation of the eventHandlers pattern.
//
// ============================================================================

import {
  rootServer,
  AccessRule,
  Channel,
  ChannelGroup,
  CommunityRole,
  AccessRuleCreateRequest,
  AccessRuleEditRequest,
  AccessRuleUpdateRequest,
  AccessRuleDeleteRequest,
  AccessRuleGetRequest,
  AccessRuleListByChannelOrChannelGroupRequest,
  AccessRuleListByRoleOrMemberRequest,
  ChannelOrChannelGroupGuid,
  RoleOrMemberGuid,
  ChannelOverlayPermission,
  ChannelCreatedEvent,
  ChannelEditedEvent,
  ChannelDeletedEvent,
  ChannelGroupCreatedEvent,
  ChannelGroupEditedEvent,
  ChannelGroupDeletedEvent,
  CommunityPermission,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  ChannelGuid,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeAccessRules(): void {
  const messages = rootServer.community.channelMessages;

  // AccessRuleClient has no .on() events — access rule changes surface as
  // channel/channelGroup events instead. Subscribe to those in the channels/
  // and channel-groups/ how-tos.

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onAccessRulesCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// An access rule is identified by a composite key: (channelOrChannelGroupId, roleOrMemberId).
// channelOrChannelGroupId targets either a single channel or an entire channel group.
// roleOrMemberId targets either a community role or an individual member.
//
// overlay permissions use ChannelOverlayPermission — all fields are optional booleans.
// Only the permissions you set are overridden; unset fields inherit from the role/group defaults.
// Requires fullControl permission on the target channel or channel group.
//
// eventHandlers: optional. Called for permission update side effects before the
// call returns. See the channels/ how-to for a full explanation.
export async function createAccessRule(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
  overlay?: ChannelOverlayPermission,
): Promise<void> {
  const request: AccessRuleCreateRequest = {
    channelOrChannelGroupId,
    roleOrMemberId,
    overlay,
  };
  return rootServer.community.accessRules.create(request, {
    "channel.created": (evt: ChannelCreatedEvent) => {
      console.log(`Side effect: channel ${evt.id} now visible`);
    },
    "channel.edited": (evt: ChannelEditedEvent) => {
      console.log(`Side effect: channel ${evt.id} permissions changed`);
    },
    "channel.deleted": (evt: ChannelDeletedEvent) => {
      console.log(`Side effect: channel ${evt.id} no longer visible`);
    },
    "channelGroup.created": (evt: ChannelGroupCreatedEvent) => {
      console.log(`Side effect: channel group ${evt.id} now visible`);
    },
    "channelGroup.edited": (evt: ChannelGroupEditedEvent) => {
      console.log(`Side effect: channel group ${evt.id} permissions changed`);
    },
    "channelGroup.deleted": (evt: ChannelGroupDeletedEvent) => {
      console.log(`Side effect: channel group ${evt.id} no longer visible`);
    },
    "community.permission.edited": (evt: CommunityPermission) => {
      console.log(`Side effect: community permissions changed`);
    },
  });
}

// edit() REPLACES the entire overlay — it is not a partial update. To preserve
// existing permissions, read the current rule via get() and merge before editing.
// Requires fullControl permission on the target channel or channel group.
export async function editAccessRule(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
  overlay: ChannelOverlayPermission,
): Promise<void> {
  const request: AccessRuleEditRequest = {
    channelOrChannelGroupId,
    roleOrMemberId,
    overlay,
  };
  return rootServer.community.accessRules.edit(request);
}

// update() is a batch operation — create, edit, and delete multiple rules in a
// single call. All changes are applied together. Each sub-operation follows the
// same rules as its standalone counterpart.
// Requires fullControl permission on each target channel or channel group.
export async function updateAccessRules(
  creates?: AccessRuleCreateRequest[],
  edits?: AccessRuleEditRequest[],
  deletes?: AccessRuleDeleteRequest[],
): Promise<void> {
  const request: AccessRuleUpdateRequest = { creates, edits, deletes };
  return rootServer.community.accessRules.update(request);
}

// No permissions required.
export async function getAccessRule(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
): Promise<AccessRule> {
  const request: AccessRuleGetRequest = { channelOrChannelGroupId, roleOrMemberId };
  return rootServer.community.accessRules.get(request);
}

// Requires fullControl permission on the target channel or channel group.
export async function deleteAccessRule(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
): Promise<void> {
  const request: AccessRuleDeleteRequest = { channelOrChannelGroupId, roleOrMemberId };
  return rootServer.community.accessRules.delete(request);
}

// Lists all access rules for a specific channel or channel group.
// No permissions required.
export async function listAccessRulesByChannelOrChannelGroup(
  channelOrChannelGroupId?: ChannelOrChannelGroupGuid,
): Promise<AccessRule[]> {
  const request: AccessRuleListByChannelOrChannelGroupRequest = { channelOrChannelGroupId };
  return rootServer.community.accessRules.listByChannelOrChannelGroup(request);
}

// Lists all access rules for a specific role or member across all channels/groups.
// No permissions required.
export async function listAccessRulesByRoleOrMember(
  roleOrMemberId?: RoleOrMemberGuid,
): Promise<AccessRule[]> {
  const request: AccessRuleListByRoleOrMemberRequest = { roleOrMemberId };
  return rootServer.community.accessRules.listByRoleOrMember(request);
}

// --- COMMAND HANDLER: /server-access-rules ------------------------------------------
// Exercises the full access rule lifecycle: create, get, list, edit, update, delete.

async function onAccessRulesCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-access-rules")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Get a role to work with
    const roles: CommunityRole[] = await rootServer.community.communityRoles.list();
    if (roles.length === 0) {
      await messages.create({ channelId, content: "No roles found." });
      return;
    }
    const role: CommunityRole = roles[0];
    lines.push(`\u2713 using role: ${role.name} (${role.id})`);

    // 2. Get the channel group containing the trigger channel
    const groups: ChannelGroup[] = await rootServer.community.channelGroups.list();
    if (groups.length === 0) {
      await messages.create({ channelId, content: "No channel groups found." });
      return;
    }
    let group: ChannelGroup = groups[0];
    for (const candidateGroup of groups) {
      const groupChannels: Channel[] = await rootServer.community.channels.list({ channelGroupId: candidateGroup.id });
      if (groupChannels.some((channel) => channel.id === channelId)) {
        group = candidateGroup;
        break;
      }
    }
    const groupId: ChannelOrChannelGroupGuid = group.id;
    const roleId: RoleOrMemberGuid = role.id;
    lines.push(`\u2713 using channel group: ${group.name} (${group.id})`);

    // 3. Create an access rule on the channel group for the role
    await createAccessRule(groupId, roleId, { channelCreateMessage: true });
    lines.push("\u2713 created access rule (channelCreateMessage: true)");

    // 4. Get the access rule
    const fetched: AccessRule = await getAccessRule(groupId, roleId);
    const overlayKeys: string[] = Object.entries(fetched.overlay)
      .filter(([_, v]) => v === true)
      .map(([k]) => k);
    lines.push(`\u2713 fetched access rule: overlay has ${overlayKeys.length} permission(s) set`);

    // 5. List rules by channel/group
    const byGroup: AccessRule[] = await listAccessRulesByChannelOrChannelGroup(groupId);
    lines.push(`\u2713 listed ${byGroup.length} rule(s) for channel group`);

    // 6. List rules by role
    const byRole: AccessRule[] = await listAccessRulesByRoleOrMember(roleId);
    lines.push(`\u2713 listed ${byRole.length} rule(s) for role`);

    // 7. Edit the rule — replaces the entire overlay
    await editAccessRule(groupId, roleId, {
      channelCreateMessage: true,
      channelViewMessageHistory: true,
    });
    lines.push("\u2713 edited access rule (added channelViewMessageHistory)");

    // 8. Delete the rule
    await deleteAccessRule(groupId, roleId);
    lines.push("\u2713 deleted access rule");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    console.error("Access rules demo error:", err);
    await messages.create({ channelId, content: `Access rules demo error: ${err}` });
  }
}
