// ============================================================================
// How-To: Channels
// SDK: channels.create, .get, .list, .move, .edit, .delete
// Permissions: channel.fullControl
// Events: ChannelEvent.ChannelCreated, .ChannelEdited, .ChannelDeleted,
//         .ChannelMoved
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
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
  ChannelGroup,
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
  ChannelType,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeChannels(): void {
  const channels = rootServer.community.channels;
  const messages = rootServer.community.channelMessages;

  channels.on(ChannelEvent.ChannelCreated, onChannelCreated);
  channels.on(ChannelEvent.ChannelEdited, onChannelEdited);
  channels.on(ChannelEvent.ChannelDeleted, onChannelDeleted);
  channels.on(ChannelEvent.ChannelMoved, onChannelMoved);

  messages.on(ChannelMessageEvent.ChannelMessageCreated, onChannelsCommand);
}

// --- OPERATIONS --------------------------------------------------------------

export async function createChannel(
  channelGroupId: ChannelGroupGuid,
  name: string,
  channelType: ChannelType,
  useChannelGroupPermission: boolean,
  description?: string,
  accessRuleCreates?: AccessRuleCreateRoleOrMemberRequest[],
): Promise<Channel> {
  const request: ChannelCreateRequest = {
    channelGroupId, name, channelType, useChannelGroupPermission, description, accessRuleCreates,
  };
  return rootServer.community.channels.create(request);
}

export async function getChannel(id: ChannelGuid): Promise<Channel> {
  const request: ChannelGetRequest = { id };
  return rootServer.community.channels.get(request);
}

export async function listChannels(channelGroupId: ChannelGroupGuid): Promise<Channel[]> {
  const request: ChannelListRequest = { channelGroupId };
  return rootServer.community.channels.list(request);
}

export async function moveChannel(
  id: ChannelGuid,
  oldChannelGroupId: ChannelGroupGuid,
  newChannelGroupId: ChannelGroupGuid,
  beforeChannelId?: ChannelGuid,
): Promise<void> {
  const request: ChannelMoveRequest = { id, oldChannelGroupId, newChannelGroupId, beforeChannelId };
  return rootServer.community.channels.move(request);
}

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
    id, name, description, updateIcon, iconTokenUri, useChannelGroupPermission, accessRuleUpdate,
  };
  return rootServer.community.channels.edit(request);
}

export async function deleteChannel(id: ChannelGuid): Promise<void> {
  const request: ChannelDeleteRequest = { id };
  return rootServer.community.channels.delete(request, {
    "channel.deleted": (evt: ChannelDeletedEvent) => {
      console.log(`Side effect: channel ${evt.id} no longer visible`);
    },
    "channelGroup.deleted": (evt: ChannelGroupDeletedEvent) => {
      console.log(`Side effect: channel group ${evt.id} no longer visible`);
    },
  });
}

export async function findChannelsByName(name: string): Promise<Channel[]> {
  // Channel names are not unique — multiple channels can share the same name.
  // There is no listAll or search-by-name method for channels.
  // Iterate every channel group and scan its channels.
  const groups: ChannelGroup[] = await rootServer.community.channelGroups.list();
  const matches: Channel[] = [];
  for (const group of groups) {
    const channels: Channel[] = await listChannels(group.id);
    matches.push(...channels.filter((ch) => ch.name === name));
  }
  return matches;
}

// --- COMMAND HANDLER: /server-channels ----------------------------------------------

async function onChannelsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-channels")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  let step = 0;
  try {
    // 1. List channel groups and find the one containing this channel
    step = 1;
    const groups: ChannelGroup[] = await rootServer.community.channelGroups.list();
    if (groups.length === 0) {
      await messages.create({ channelId, content: "No channel groups found." });
      return;
    }
    // Find the group containing the trigger channel
    let group = groups[0];
    for (const candidateGroup of groups) {
      const groupChannels: Channel[] = await listChannels(candidateGroup.id);
      if (groupChannels.some((channel) => channel.id === channelId)) {
        group = candidateGroup;
        break;
      }
    }
    lines.push(`✓ using channel group: ${group.name} (${group.id})`);

    // 2. Create a channel
    step = 2;
    const channel: Channel = await createChannel(
      group.id, "test-channel", ChannelType.Text, true /* useChannelGroupPermission */, "A test channel",
    );
    lines.push(`✓ created channel: ${channel.name} (${channel.id})`);

    // 3. Find channels by name (cross-group search — names are not unique)
    step = 3;
    const found: Channel[] = await findChannelsByName("test-channel");
    lines.push(`✓ found ${found.length} channel(s) named "test-channel"`);

    // 4. List channels
    step = 4;
    const channelList: Channel[] = await listChannels(group.id);
    lines.push(`✓ listed ${channelList.length} channel(s) in group`);

    // 5. Get channel
    step = 5;
    const fetched: Channel = await getChannel(channel.id);
    lines.push(`✓ fetched channel: name=${fetched.name}, type=${fetched.channelType}`);

    // 6. Edit channel
    step = 6;
    await editChannel(channel.id, "renamed-channel", true, "Updated description");
    lines.push("✓ edited channel name and description");

    // 7. Create target group + move channel
    step = 7;
    const moveTarget: ChannelGroup = await rootServer.community.channelGroups.create({ name: "Move Target" });
    step = 8;
    await moveChannel(channel.id, group.id, moveTarget.id);
    lines.push(`✓ moved channel from ${group.name} to ${moveTarget.name}`);

    // 9. Delete channel + cleanup
    step = 9;
    await deleteChannel(channel.id);
    step = 10;
    await rootServer.community.channelGroups.delete({ id: moveTarget.id });
    lines.push("✓ deleted channel and move-target group");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts = [`Channels demo error: ${err}`];
    if (err instanceof RootApiException) {
      parts.push(`errorCode: ${err.errorCode}`);
      if (err.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    }
    parts.push(`failed at step ${step}`);
    if (lines.length > 0) parts.push(`completed ${lines.length}/10 steps`);
    await messages.create({ channelId, content: parts.join("\n") });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------

function onChannelCreated(evt: ChannelCreatedEvent): void {
  console.log(`Channel created: id=${evt.id} name=${evt.name} groupId=${evt.channelGroupId}`);
}

function onChannelEdited(evt: ChannelEditedEvent): void {
  console.log(`Channel edited: id=${evt.id} name=${evt.name} groupId=${evt.channelGroupId}`);
}

function onChannelDeleted(evt: ChannelDeletedEvent): void {
  console.log(`Channel deleted: id=${evt.id} groupId=${evt.channelGroupId}`);
}

function onChannelMoved(evt: ChannelMovedEvent): void {
  console.log(`Channel moved: id=${evt.id} groupId=${evt.channelGroupId}`);
}
