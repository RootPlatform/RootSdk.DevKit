// ============================================================================
// API Sample: Community
// SDK: communities.get, .edit
// Permissions: community.manageCommunity (edit only; get requires none)
// Events: CommunityEvent.CommunityEdited, .CommunityJoined, .CommunityLeave
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Get and edit the community. The community is the top-level entity — there
// is exactly one per app/bot installation. get() takes zero parameters.
// edit() is a full replacement — all fields are required, not a partial patch.
//
// IMPORTANT: A bot/app never receives its own CommunityJoined event because
// it is already a member when onStarting runs. To detect other bots joining,
// check RootGuidUtils.toRootGuidType(evt.userId) === RootGuidType.App.
//
// ============================================================================

import {
  rootServer,
  RootGuidUtils,
  RootGuidType,
  CommunityEvent,
  CommunityEditedEvent,
  CommunityJoinedEvent,
  CommunityLeaveEvent,
  CommunityLeaveReason,
  Community,
  CommunityEditRequest,
  ChannelGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeCommunity(): void {
  const communities = rootServer.community.communities;
  const messages = rootServer.community.channelMessages;

  // Community events
  communities.on(CommunityEvent.CommunityEdited, onCommunityEdited);
  communities.on(CommunityEvent.CommunityJoined, onCommunityJoined);
  communities.on(CommunityEvent.CommunityLeave, onCommunityLeave);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onCommunityCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// No parameters needed — returns the community this bot/app is installed in.
// No permissions required.
export async function getCommunity(): Promise<Community> {
  return rootServer.community.communities.get();
}

// Full replacement — every field is required. Omitting a field resets it to its
// default, not "no change". To leave picture unchanged, set updatePicture: false.
//
// pictureTokenUri: a raw upload token from the platform's asset upload endpoint.
// Upload tokens are temporary and should be used promptly, not stored.
// Set updatePicture: false and omit pictureTokenUri to skip picture changes.
//
// Requires community.manageCommunity permission.
export async function editCommunity(
  name: string,
  pictureHex: string,
  rejectUnverifiedEmail: boolean,
  defaultChannelId?: ChannelGuid,
): Promise<Community> {
  const request: CommunityEditRequest = {
    name,
    pictureHex,
    updatePicture: false, // Set true + provide pictureTokenUri to change picture
    pictureTokenUri: undefined,
    defaultChannelId,
    rejectUnverifiedEmail,
  };
  return rootServer.community.communities.edit(request);
}

// --- COMMAND HANDLER: /server-community ---------------------------------------------
// Exercises the full community lifecycle: get, edit (rename), get (confirm), restore.

async function onCommunityCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-community")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Get the community
    const community: Community = await getCommunity();
    lines.push(
      `✓ get: name="${community.name}" pictureHex=${community.pictureHex} ` +
      `owner=${community.ownerUserId} defaultChannel=${community.defaultChannelId} ` +
      `rejectUnverified=${community.rejectUnverifiedEmail}`,
    );

    const originalName = community.name;

    // 2. Edit the community — rename (append "Edited" — no spaces/brackets allowed)
    const edited: Community = await editCommunity(
      originalName + "Edited",
      community.pictureHex,
      community.rejectUnverifiedEmail,
      community.defaultChannelId,
    );
    lines.push(`✓ edit: renamed to "${edited.name}"`);

    // 3. Get again to confirm the edit took effect
    const confirmed: Community = await getCommunity();
    lines.push(`✓ get (confirm): name="${confirmed.name}"`);

    // 4. Restore original name
    const restored: Community = await editCommunity(
      originalName,
      community.pictureHex,
      community.rejectUnverifiedEmail,
      community.defaultChannelId,
    );
    lines.push(`✓ edit (restore): name="${restored.name}"`);

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts: string[] = [];
    if (err instanceof RootApiException) {
      parts.push(`Community demo error: ${err.errorCode}`);
      if (err.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    } else if (err instanceof Error) {
      parts.push(`Community demo error: ${err.message}`);
    }
    await messages.create({ channelId, content: parts.join("\n") });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// Events fire only for changes that occur AFTER subscription. There is no
// replay of historical events. The bot/app is already a community member when
// onStarting runs, so its own join event is never received.

function onCommunityEdited(evt: CommunityEditedEvent): void {
  console.log(
    `Community edited: id=${evt.communityId} name="${evt.name}" ` +
    `pictureHex=${evt.pictureHex} rejectUnverified=${evt.rejectUnverifiedEmail}`,
  );
}

function onCommunityJoined(evt: CommunityJoinedEvent): void {
  // RootGuidUtils.toRootGuidType() extracts the type from any GUID.
  // RootGuidType.App identifies bots and apps; RootGuidType.Person identifies humans.
  // Use this to skip bot/app joins when you only want to act on human members.
  const guidType = RootGuidUtils.toRootGuidType(evt.userId);
  const isBot = guidType === RootGuidType.App;

  console.log(
    `Community joined: id=${evt.communityId} userId=${evt.userId} ` +
    `type=${RootGuidType[guidType]} isBot=${isBot} ` +
    `roleIds=${evt.communityRoleIds?.join(", ") ?? "(none)"}`,
  );
}

// CommunityLeaveReason: Unspecified = 0, User = 1 (voluntary), Kicked = 4 (removed),
// Banned = 7 (banned from the community). Note the gaps in numbering.
function onCommunityLeave(evt: CommunityLeaveEvent): void {
  const reasonName = CommunityLeaveReason[evt.leaveReason] ?? "Unknown";
  console.log(
    `Community leave: id=${evt.communityId} userId=${evt.userId} ` +
    `reason=${reasonName} (${evt.leaveReason})`,
  );
}
