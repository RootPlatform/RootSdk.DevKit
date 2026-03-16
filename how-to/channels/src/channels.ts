// ============================================================================
// How-To: Channels
// SDK: channels.create, .get, .list, .move, .edit, .delete
// Permissions: channel.fullControl
// Events: ChannelEvent.ChannelCreated, .ChannelEdited, .ChannelDeleted,
//         .ChannelMoved
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Create, get, list, move, edit, and delete channels within channel groups.
// Mutation methods (move, edit, delete) accept an optional eventHandlers
// parameter for handling permission update side effects.
//
// ============================================================================

import {
  rootServer,
  ChannelEvent,
  ChannelCreatedEvent,
  ChannelEditedEvent,
  ChannelDeletedEvent,
  ChannelMovedEvent,
  Channel,
  ChannelGuid,
  ChannelGroupGuid,
  ChannelCreateRequest,
  ChannelGetRequest,
  ChannelListRequest,
  ChannelMoveRequest,
  ChannelEditRequest,
  ChannelDeleteRequest,
  ChannelGroupDeletedEvent,
  AccessRuleCreateRoleOrMemberRequest,
  AccessRuleUpdateRequest,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeChannels(): void {
  const channels = rootServer.community.channels;
  const messages = rootServer.community.channelMessages;

  // Channel events
  channels.on(ChannelEvent.ChannelCreated, onChannelCreated);
  channels.on(ChannelEvent.ChannelEdited, onChannelEdited);
  channels.on(ChannelEvent.ChannelDeleted, onChannelDeleted);
  channels.on(ChannelEvent.ChannelMoved, onChannelMoved);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onChannelsCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Channel names: letters, digits, hyphens only. No spaces, no leading/trailing/
// consecutive hyphens. 1-100 characters. Regex: ^(?!.*--)(?!-)[A-Za-z0-9-]+(?<!-)$
// Channel descriptions: max 256 characters. Whitespace-only is normalized to undefined.
// channelType is a raw number (not an enum).
// Requires fullControl permission on the containing channel group.
export async function createChannel(
  channelGroupId: ChannelGroupGuid,
  name: string,
  channelType: number,
  useChannelGroupPermission: boolean,
  description?: string,
  accessRuleCreates?: AccessRuleCreateRoleOrMemberRequest[],
): Promise<Channel> {
  const request: ChannelCreateRequest = {
    channelGroupId,
    name,
    channelType,
    useChannelGroupPermission,
    description,
    accessRuleCreates,
  };
  return rootServer.community.channels.create(request);
}

// No permissions required.
export async function getChannel(id: ChannelGuid): Promise<Channel> {
  const request: ChannelGetRequest = { id };
  return rootServer.community.channels.get(request);
}

// Lists channels within a specific channel group — not globally.
// No permissions required.
export async function listChannels(channelGroupId: ChannelGroupGuid): Promise<Channel[]> {
  const request: ChannelListRequest = { channelGroupId };
  return rootServer.community.channels.list(request);
}

// Requires both oldChannelGroupId and newChannelGroupId.
// beforeChannelId controls ordering — places the channel before the specified channel.
// Requires fullControl permission on source and destination channel groups.
//
// eventHandlers: optional. Called for permission update side effects of this
// operation before the call returns. See deleteChannel() for full explanation.
export async function moveChannel(
  id: ChannelGuid,
  oldChannelGroupId: ChannelGroupGuid,
  newChannelGroupId: ChannelGroupGuid,
  beforeChannelId?: ChannelGuid,
): Promise<void> {
  const request: ChannelMoveRequest = { id, oldChannelGroupId, newChannelGroupId, beforeChannelId };
  return rootServer.community.channels.move(request);
}

// updateIcon: set to true and provide iconTokenUri to change the icon,
// or set to true with no iconTokenUri to remove it. Set to false to leave unchanged.
// useChannelGroupPermission: true inherits permissions from the parent group.
// accessRuleUpdate: batch create/edit/delete access rules inline (see access-rules/ how-to).
// Requires fullControl permission on the channel.
//
// eventHandlers: optional. Called for permission update side effects of this
// operation before the call returns. See deleteChannel() for full explanation.
export async function editChannel(
  id: ChannelGuid,
  name: string,
  useChannelGroupPermission: boolean,
  description?: string,
  updateIcon: boolean = false,
  iconTokenUri?: string,
  accessRuleUpdate?: AccessRuleUpdateRequest,
): Promise<void> {
  const request: ChannelEditRequest = {
    id,
    name,
    description,
    updateIcon,
    iconTokenUri,
    useChannelGroupPermission,
    accessRuleUpdate,
  };
  return rootServer.community.channels.edit(request);
}

// Requires fullControl permission on the channel.
//
// eventHandlers: the optional second parameter on mutation methods (move, edit,
// delete) handles permission update side effects — cascading changes to OTHER
// resources caused by your operation. Handlers run sequentially before the API
// call returns (synchronous, one-shot).
//
// In this context, "deleted" means your code LOST VISIBILITY — either the
// resource was actually deleted OR your permissions changed. Your code cannot
// distinguish the two. Treat both the same: clean up local references.
//
// Use eventHandlers for side effects of YOUR operation.
// Use .on() subscriptions for changes from ANY source (async, ongoing).
export async function deleteChannel(id: ChannelGuid): Promise<void> {
  const request: ChannelDeleteRequest = { id };
  return rootServer.community.channels.delete(request, {
    // Called if deleting this channel causes a channel group to lose visibility.
    "channel.deleted": (evt: ChannelDeletedEvent) => {
      console.log(`Side effect: channel ${evt.id} no longer visible`);
    },
    "channelGroup.deleted": (evt: ChannelGroupDeletedEvent) => {
      console.log(`Side effect: channel group ${evt.id} no longer visible`);
    },
  });
}

// --- COMMAND HANDLER: /channels ----------------------------------------------
// Exercises the full channel lifecycle: create, list, get, edit, delete.

async function onChannelsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/channels")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List channel groups to find one to work in
    const groups = await rootServer.community.channelGroups.list();
    if (groups.length === 0) {
      await messages.create({ channelId, content: "No channel groups found." });
      return;
    }
    const group = groups[0];
    lines.push(`✓ using channel group: ${group.name} (${group.id})`);

    // 2. Create a channel in that group
    const channel = await createChannel(
      group.id, "test-channel", 0, true, "A test channel",
    );
    lines.push(`✓ created channel: ${channel.name} (${channel.id})`);

    // 3. List channels in the group
    const channelList = await listChannels(group.id);
    lines.push(`✓ listed ${channelList.length} channel(s) in group`);

    // 4. Get the channel by ID
    const fetched = await getChannel(channel.id);
    lines.push(`✓ fetched channel: name=${fetched.name}, type=${fetched.channelType}`);

    // 5. Edit the channel
    await editChannel(channel.id, "renamed-channel", true, "Updated description");
    lines.push("✓ edited channel name and description");

    // 6. Delete the channel (with eventHandlers)
    await deleteChannel(channel.id);
    lines.push("✓ deleted channel");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err) {
    console.error("Channels demo error:", err);
    await messages.create({ channelId, content: `Channels demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL channel changes from any source.
// Use these for reacting to external changes (users, other apps).
// Use eventHandlers parameter on mutation methods for your own operation's side effects.

function onChannelCreated(evt: ChannelCreatedEvent): void {
  console.log(
    `Channel created: id=${evt.id} name=${evt.name} groupId=${evt.channelGroupId} ` +
    `type=${evt.channelType} useGroupPerm=${evt.useChannelGroupPermission}`,
  );
}

function onChannelEdited(evt: ChannelEditedEvent): void {
  console.log(
    `Channel edited: id=${evt.id} name=${evt.name} groupId=${evt.channelGroupId} ` +
    `useGroupPerm=${evt.useChannelGroupPermission}`,
  );
}

function onChannelDeleted(evt: ChannelDeletedEvent): void {
  console.log(`Channel deleted: id=${evt.id} groupId=${evt.channelGroupId}`);
}

function onChannelMoved(evt: ChannelMovedEvent): void {
  console.log(
    `Channel moved: id=${evt.id} groupId=${evt.channelGroupId} ` +
    `beforeChannelId=${evt.beforeChannelId}`,
  );
}
