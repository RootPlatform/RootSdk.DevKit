// ============================================================================
// How-To: Channel Groups
// SDK: channelGroups.create, .get, .list, .edit, .move, .delete
// Permissions: community.createChannelGroup, channel.fullControl
// Events: ChannelGroupEvent.ChannelGroupCreated, .ChannelGroupEdited,
//         .ChannelGroupDeleted, .ChannelGroupMoved
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Create, get, list, edit, move, and delete channel groups. Channel groups
// organize channels and can define permissions that channels inherit.
//
// ============================================================================

import {
  rootServer,
  ChannelGroupEvent,
  ChannelGroupCreatedEvent,
  ChannelGroupEditedEvent,
  ChannelGroupDeletedEvent,
  ChannelGroupMovedEvent,
  ChannelGroup,
  ChannelGroupGuid,
  ChannelGroupCreateRequest,
  ChannelGroupGetRequest,
  ChannelGroupEditRequest,
  ChannelGroupMoveRequest,
  ChannelGroupDeleteRequest,
  AccessRuleCreateRoleOrMemberRequest,
  AccessRuleUpdateRequest,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeChannelGroups(): void {
  const channelGroups = rootServer.community.channelGroups;
  const messages = rootServer.community.channelMessages;

  // Channel group events
  channelGroups.on(ChannelGroupEvent.ChannelGroupCreated, onChannelGroupCreated);
  channelGroups.on(ChannelGroupEvent.ChannelGroupEdited, onChannelGroupEdited);
  channelGroups.on(ChannelGroupEvent.ChannelGroupDeleted, onChannelGroupDeleted);
  channelGroups.on(ChannelGroupEvent.ChannelGroupMoved, onChannelGroupMoved);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onChannelGroupsCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Group names: letters, digits, single apostrophe, single space. No hyphens.
// 1-100 characters. Different naming rules than channels.
// Requires createChannelGroup permission on the community.
export async function createChannelGroup(
  name: string,
  accessRuleCreates?: AccessRuleCreateRoleOrMemberRequest[],
): Promise<ChannelGroup> {
  const request: ChannelGroupCreateRequest = { name, accessRuleCreates };
  return rootServer.community.channelGroups.create(request);
}

// No permissions required.
export async function getChannelGroup(id: ChannelGroupGuid): Promise<ChannelGroup> {
  const request: ChannelGroupGetRequest = { id };
  return rootServer.community.channelGroups.get(request);
}

// Returns all channel groups in the community — no parameters needed.
// No permissions required.
export async function listChannelGroups(): Promise<ChannelGroup[]> {
  return rootServer.community.channelGroups.list();
}

// accessRuleUpdate: batch create/edit/delete access rules inline (see access-rules/ how-to).
// Requires fullControl permission on the channel group.
//
// eventHandlers: optional second parameter for handling permission update side effects.
// Editing a group's access rules can cause channels inheriting from this group to
// gain or lose visibility. Handlers run synchronously before the call returns.
// In this context, "created"/"deleted" mean visibility changes, not actual
// creation/deletion. See the channels/ how-to for a full explanation.
export async function editChannelGroup(
  id: ChannelGroupGuid,
  name: string,
  accessRuleUpdate?: AccessRuleUpdateRequest,
): Promise<void> {
  const request: ChannelGroupEditRequest = { id, name, accessRuleUpdate };
  return rootServer.community.channelGroups.edit(request, {
    // Called if editing this group's permissions causes a group to become visible.
    "channelGroup.created": (evt: ChannelGroupCreatedEvent) => {
      console.log(`Side effect: channel group ${evt.id} now visible (name=${evt.name})`);
    },
    // Called if editing this group's permissions causes a group to lose visibility.
    "channelGroup.deleted": (evt: ChannelGroupDeletedEvent) => {
      console.log(`Side effect: channel group ${evt.id} no longer visible`);
    },
  });
}

// beforeChannelGroupId controls ordering — places this group before the specified group.
// Omit to move to the end.
// Requires fullControl permission on the channel group.
export async function moveChannelGroup(
  id: ChannelGroupGuid,
  beforeChannelGroupId?: ChannelGroupGuid,
): Promise<void> {
  const request: ChannelGroupMoveRequest = { id, beforeChannelGroupId };
  return rootServer.community.channelGroups.move(request);
}

// Requires fullControl permission on the channel group AND all channels it contains.
// Deleting a group also deletes all channels within it.
export async function deleteChannelGroup(id: ChannelGroupGuid): Promise<void> {
  const request: ChannelGroupDeleteRequest = { id };
  return rootServer.community.channelGroups.delete(request);
}

// --- COMMAND HANDLER: /server-channel-groups ----------------------------------------
// Exercises the full channel group lifecycle: create, list, get, edit, move, delete.

async function onChannelGroupsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-channel-groups")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List existing groups
    const existing = await listChannelGroups();
    lines.push(`✓ listed ${existing.length} existing group(s)`);

    // 2. Create two groups
    const groupA = await createChannelGroup("TestAlpha");
    lines.push(`✓ created group: ${groupA.name} (${groupA.id})`);

    const groupB = await createChannelGroup("TestBeta");
    lines.push(`✓ created group: ${groupB.name} (${groupB.id})`);

    // 3. Get one by ID
    const fetched = await getChannelGroup(groupA.id);
    lines.push(`✓ fetched group: name=${fetched.name}`);

    // 4. Edit the name
    await editChannelGroup(groupA.id, "RenamedAlpha");
    lines.push("✓ edited group name");

    // 5. Move group A before group B
    await moveChannelGroup(groupA.id, groupB.id);
    lines.push("✓ moved group A before group B");

    // 6. Delete both groups
    await deleteChannelGroup(groupA.id);
    await deleteChannelGroup(groupB.id);
    lines.push("✓ deleted both groups");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: any) {
    const parts = [`Channel groups demo error: ${err}`];
    if (err?.code) parts.push(`code: ${err.code}`);
    if (err?.errorCode) parts.push(`errorCode: ${err.errorCode}`);
    if (err?.meta) parts.push(`meta: ${JSON.stringify(err.meta)}`);
    if (err?.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    if (lines.length > 0) parts.push(`completed ${lines.length}/7 steps`);
    console.error("Channel groups demo error:", err);
    await messages.create({ channelId, content: parts.join("\n") });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL channel group changes from any source.
// Use these for reacting to external changes (users, other apps).
// Use eventHandlers parameter on edit() for your own operation's side effects.

function onChannelGroupCreated(evt: ChannelGroupCreatedEvent): void {
  console.log(
    `Channel group created: id=${evt.id} name=${evt.name} ` +
    `beforeGroupId=${evt.beforeChannelGroupId}`,
  );
}

function onChannelGroupEdited(evt: ChannelGroupEditedEvent): void {
  console.log(`Channel group edited: id=${evt.id} name=${evt.name}`);
}

function onChannelGroupDeleted(evt: ChannelGroupDeletedEvent): void {
  console.log(`Channel group deleted: id=${evt.id}`);
}

function onChannelGroupMoved(evt: ChannelGroupMovedEvent): void {
  console.log(
    `Channel group moved: id=${evt.id} beforeGroupId=${evt.beforeChannelGroupId}`,
  );
}
