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
} from "@rootsdk/server-bot";

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
  channelType: number,
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
  return rootServer.community.channels.get({ id });
}

export async function listChannels(channelGroupId: ChannelGroupGuid): Promise<Channel[]> {
  return rootServer.community.channels.list({ channelGroupId });
}

export async function moveChannel(
  id: ChannelGuid,
  oldChannelGroupId: ChannelGroupGuid,
  newChannelGroupId: ChannelGroupGuid,
  beforeChannelId?: ChannelGuid,
): Promise<void> {
  return rootServer.community.channels.move({ id, oldChannelGroupId, newChannelGroupId, beforeChannelId });
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
  return rootServer.community.channels.edit({
    id, name, description, updateIcon, iconTokenUri, useChannelGroupPermission, accessRuleUpdate,
  });
}

export async function deleteChannel(id: ChannelGuid): Promise<void> {
  return rootServer.community.channels.delete({ id }, {
    "channel.deleted": (evt: ChannelDeletedEvent) => {
      console.log(`Side effect: channel ${evt.id} no longer visible`);
    },
    "channelGroup.deleted": (evt: ChannelGroupDeletedEvent) => {
      console.log(`Side effect: channel group ${evt.id} no longer visible`);
    },
  });
}

// --- COMMAND HANDLER: /channels ----------------------------------------------

async function onChannelsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/channels")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  let step = 0;
  try {
    // 1. List channel groups and find the one containing this channel
    step = 1;
    const groups = await rootServer.community.channelGroups.list();
    if (groups.length === 0) {
      await messages.create({ channelId, content: "No channel groups found." });
      return;
    }
    // Find the group containing the trigger channel
    let group = groups[0];
    for (const g of groups) {
      const channels = await listChannels(g.id);
      if (channels.some((ch) => ch.id === channelId)) {
        group = g;
        break;
      }
    }
    lines.push(`✓ using channel group: ${group.name} (${group.id})`);

    // 2. Create a channel
    step = 2;
    const channel = await createChannel(group.id, "test-channel", 1, true, "A test channel");
    lines.push(`✓ created channel: ${channel.name} (${channel.id})`);

    // 3. List channels
    step = 3;
    const channelList = await listChannels(group.id);
    lines.push(`✓ listed ${channelList.length} channel(s) in group`);

    // 4. Get channel
    step = 4;
    const fetched = await getChannel(channel.id);
    lines.push(`✓ fetched channel: name=${fetched.name}, type=${fetched.channelType}`);

    // 5. Edit channel
    step = 5;
    await editChannel(channel.id, "renamed-channel", true, "Updated description");
    lines.push("✓ edited channel name and description");

    // 6. Create target group + move channel
    step = 6;
    const moveTarget = await rootServer.community.channelGroups.create({ name: "Move Target" });
    step = 7;
    await moveChannel(channel.id, group.id, moveTarget.id);
    lines.push("✓ moved channel from " + group.name + " to " + moveTarget.name);

    // 7. Delete channel + cleanup
    step = 8;
    await deleteChannel(channel.id);
    step = 9;
    await rootServer.community.channelGroups.delete({ id: moveTarget.id });
    lines.push("✓ deleted channel and move-target group");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: any) {
    const parts = [`Channels demo error: ${err}`];
    if (err?.code) parts.push(`code: ${err.code}`);
    if (err?.errorCode) parts.push(`errorCode: ${err.errorCode}`);
    if (err?.meta) parts.push(`meta: ${JSON.stringify(err.meta)}`);
    if (err?.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    parts.push(`failed at step ${step}`);
    if (lines.length > 0) parts.push(`completed ${lines.length}/7 steps`);
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
