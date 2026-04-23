// ============================================================================
// API Sample: Roles
// SDK: communityRoles.create, .get, .list, .edit, .move, .delete
// Permissions: community.manageRoles
// Events: CommunityRoleEvent.CommunityRoleCreated, .CommunityRoleEdited,
//         .CommunityRoleDeleted, .CommunityRoleMoved
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Create, get, list, edit, move, and delete community roles.
// Roles define a named set of community and channel permissions that can be
// assigned to members via the member-roles/ api sample.
//
// ============================================================================

import {
  rootServer,
  CommunityRole,
  CommunityRoleGuid,
  CommunityRoleCreateRequest,
  CommunityRoleEditRequest,
  CommunityRoleMoveRequest,
  CommunityRoleDeleteRequest,
  CommunityRoleGetRequest,
  CommunityRoleEvent,
  CommunityRoleCreatedEvent,
  CommunityRoleEditedEvent,
  CommunityRoleDeletedEvent,
  CommunityRoleMovedEvent,
  CommunityPermission,
  ChannelPermission,
  WellKnownRootGuids,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  ChannelGuid,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeRoles(): void {
  const roles = rootServer.community.communityRoles;
  const messages = rootServer.community.channelMessages;

  // Role events
  roles.on(CommunityRoleEvent.CommunityRoleCreated, onRoleCreated);
  roles.on(CommunityRoleEvent.CommunityRoleEdited, onRoleEdited);
  roles.on(CommunityRoleEvent.CommunityRoleDeleted, onRoleDeleted);
  roles.on(CommunityRoleEvent.CommunityRoleMoved, onRoleMoved);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onRolesCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Role names: letters, digits, hyphens only. No spaces, no leading/trailing/
// consecutive hyphens. 1-100 characters. Same regex as channel names.
// colorHex: exactly 7 characters, format #RRGGBB (e.g., "#AABB01").
// isMentionable: whether the role can be @mentioned in channels.
// communityPermission and channelPermission define the role's default permissions.
// Requires manageRoles permission on the community.
export async function createRole(
  name: string,
  isMentionable: boolean,
  colorHex?: string,
  communityPermission?: CommunityPermission,
  channelPermission?: ChannelPermission,
): Promise<CommunityRole> {
  const request: CommunityRoleCreateRequest = {
    name,
    isMentionable,
    colorHex,
    communityPermission,
    channelPermission,
  };
  return rootServer.community.communityRoles.create(request);
}

// No permissions required.
export async function getRole(id: CommunityRoleGuid): Promise<CommunityRole> {
  const request: CommunityRoleGetRequest = { id };
  return rootServer.community.communityRoles.get(request);
}

// Returns all roles in the community. No parameters needed.
// No permissions required.
export async function listRoles(): Promise<CommunityRole[]> {
  return rootServer.community.communityRoles.list();
}

// edit() requires ALL fields — it replaces the entire role definition.
// Fetch the current role via get() first, then change only the fields you need.
// Requires manageRoles permission on the community.
export async function editRole(
  id: CommunityRoleGuid,
  name: string,
  colorHex: string,
  isMentionable: boolean,
  communityPermission?: CommunityPermission,
  channelPermission?: ChannelPermission,
): Promise<CommunityRole> {
  const request: CommunityRoleEditRequest = {
    id,
    name,
    colorHex,
    isMentionable,
    communityPermission,
    channelPermission,
  };
  return rootServer.community.communityRoles.edit(request);
}

// beforeCommunityRoleId controls ordering — places the role before the specified role.
// Omit to move to the end.
// Requires manageRoles permission on the community.
export async function moveRole(
  id: CommunityRoleGuid,
  beforeCommunityRoleId?: CommunityRoleGuid,
): Promise<void> {
  const request: CommunityRoleMoveRequest = { id, beforeCommunityRoleId };
  return rootServer.community.communityRoles.move(request);
}

// Requires manageRoles permission on the community.
export async function deleteRole(id: CommunityRoleGuid): Promise<void> {
  const request: CommunityRoleDeleteRequest = { id };
  return rootServer.community.communityRoles.delete(request);
}

// --- COMMAND HANDLER: /server-roles -------------------------------------------------
// Exercises the full role lifecycle: create, list, get, edit, move, delete.

async function onRolesCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-roles")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List existing roles
    const existing: CommunityRole[] = await listRoles();
    lines.push(`\u2713 listed ${existing.length} existing role(s)`);

    // WellKnownRootGuids.CommunityRoles.EveryoneRole is the @everyone role GUID.
    // Every community has this role and every member is assigned to it.
    // Use it to identify or skip the default role when iterating roles.
    const everyoneRole: CommunityRole | undefined = existing.find(
      (r) => r.id === WellKnownRootGuids.CommunityRoles.EveryoneRole,
    );
    lines.push(
      `\u2713 @everyone role: ${everyoneRole ? everyoneRole.name : "not found"}`,
    );

    // 2. Create a role
    const role: CommunityRole = await createRole("test-role", true, "#AA00FF");
    lines.push(`\u2713 created role: ${role.name} (${role.id}) color=${role.colorHex}`);

    // 3. Get the role by ID
    const fetched: CommunityRole = await getRole(role.id);
    lines.push(`\u2713 fetched role: name=${fetched.name} mentionable=${fetched.isMentionable}`);

    // 4. Edit the role — must provide all fields
    const edited: CommunityRole = await editRole(
      role.id,
      "renamed-role",
      "#FF0000",
      false,
      fetched.communityPermission,
      fetched.channelPermission,
    );
    lines.push(`\u2713 edited role: name=${edited.name} color=${edited.colorHex}`);

    // 5. Create a second role to test move ordering
    const role2: CommunityRole = await createRole("test-role-two", false, "#00FF00");
    lines.push(`\u2713 created second role: ${role2.name} (${role2.id})`);

    // 6. Move the first role before the second
    await moveRole(role.id, role2.id);
    lines.push("\u2713 moved first role before second");

    // 7. Delete both roles
    await deleteRole(role.id);
    await deleteRole(role2.id);
    lines.push("\u2713 deleted both roles");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts: string[] = [];
    if (err instanceof RootApiException) {
      parts.push(`Roles demo error: ${err.errorCode}`);
      if (err.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    } else if (err instanceof Error) {
      parts.push(`Roles demo error: ${err.message}`);
    }
    await messages.create({ channelId, content: parts.join("\n") });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL role changes from any source.

function onRoleCreated(evt: CommunityRoleCreatedEvent): void {
  console.log(
    `Role created: id=${evt.id} name=${evt.name} color=${evt.colorHex} ` +
    `mentionable=${evt.isMentionable}`,
  );
}

function onRoleEdited(evt: CommunityRoleEditedEvent): void {
  console.log(
    `Role edited: id=${evt.id} name=${evt.name} color=${evt.colorHex} ` +
    `mentionable=${evt.isMentionable}`,
  );
}

function onRoleDeleted(evt: CommunityRoleDeletedEvent): void {
  console.log(`Role deleted: roleId=${evt.communityRoleId}`);
}

function onRoleMoved(evt: CommunityRoleMovedEvent): void {
  console.log(
    `Role moved: id=${evt.id} beforeRoleId=${evt.beforeCommunityRoleId}`,
  );
}
