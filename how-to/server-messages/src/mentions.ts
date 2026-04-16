// ============================================================================
// How-To: Mentions in Messages
// SDK: channelMessages.create (mentions are markdown in message content)
// Permissions: channel.createMessage, channel.createMessageMention (for @All/@Here)
// Events: ChannelMessageCreated (read references via referenceMaps)
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Mentions are NOT a separate API — they are CommonMark markdown links
// embedded in message content using the root:// URI scheme.
//
// Mention syntax:
//   User mention:  [@DisplayName](root://user/<userId>)
//   Role mention:  [@RoleName](root://role/<roleId>)
//   @All mention:   [@All](root://role/All)
//   @Here mention:  [@Here](root://role/Here)
//
// The platform resolves these URIs and renders them as interactive mentions
// in the client UI. The text in brackets is standard markdown link text —
// the @ prefix is just a convention, not special syntax.
//
// To READ mentions from incoming messages, use evt.referenceMaps — the
// platform parses all root:// URIs and resolves them to current display names.
// ReferenceMaps appear on ChannelMessageCreatedEvent, ChannelMessageEditedEvent,
// ChannelMessage, and list/pin-list responses.
//
// ============================================================================

import {
  rootServer,
  RootApiException,
  ErrorCodeType,
  MessageType,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelGuid,
  UserGuid,
  CommunityRoleGuid,
  CommunityMemberGetRequest,
  ChannelMessageCreateRequest,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeMentions(): void {
  const messages = rootServer.community.channelMessages;

  // Send a message containing all mention types
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onMentionCommand);

  // Log resolved references from incoming messages
  messages.on(ChannelMessageEvent.ChannelMessageCreated, logReferenceMaps);
}

// --- CONSTRUCTING MENTIONS ---------------------------------------------------

// Build a user mention string. The displayName appears as the link text
// in the rendered message.
// IMPORTANT: Always fetch the member's current nickname via communityMembers.get()
// before calling this. Don't use the userId or a hardcoded string as display text —
// the rendered mention will show whatever you pass here.
function userMention(displayName: string, userId: UserGuid): string {
  return `[@${displayName}](root://user/${userId})`;
}

// Build a role mention string. All members with this role will be notified.
function roleMention(roleName: string, roleId: CommunityRoleGuid): string {
  return `[@${roleName}](root://role/${roleId})`;
}

// Mention all members. Uses the literal "All" role ID.
// Requires the channelMentionAll permission in root-manifest.json.
function mentionAll(): string {
  return "[@All](root://role/All)";
}

// Mention all online members. Uses the literal "Here" role ID.
function mentionHere(): string {
  return "[@Here](root://role/Here)";
}

// --- READING REFERENCES: referenceMaps ---------------------------------------
//
// When you receive a message (via event or API), the platform provides
// referenceMaps — pre-parsed and resolved references for all root:// URIs
// in the message content. This is the preferred way to detect mentions.
//
// referenceMaps fields:
//   users?    — { userId, name }[]           — mentioned users
//   roles?    — { communityRoleId, name }[]  — mentioned roles (including @All)
//   channels? — { channelId, name }[]        — linked channels
//   assets?   — { [key]: AssetInformation }  — linked assets
//
// Names are resolved at retrieval time — they reflect the CURRENT display
// name, not what was typed when the message was sent. If a user changes
// their nickname, referenceMaps will return the new name.

// --- COMMAND HANDLER: /mention -----------------------------------------------
//
// Sends a single message demonstrating all mention types.

async function onMentionCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  if (evt.messageContent !== "/mention") return;

  try {
    const memberRequest: CommunityMemberGetRequest = { userId: evt.userId };
    const member = await rootServer.community.communityMembers.get(memberRequest);

    const content = [
      `User: ${userMention(member.nickname, evt.userId)}`,
      `All: ${mentionAll()}`,
      `Here: ${mentionHere()}`,
    ].join("\n");

    const createRequest: ChannelMessageCreateRequest = { channelId: evt.channelId, content };
    await rootServer.community.channelMessages.create(createRequest);
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.NoPermissionToCreate:
          // @All and @Here require channelMentionAll permission
          // in addition to createMessage.
          console.error("Missing permission — check createMessage and channelMentionAll");
          break;
        default:
          console.error("RootApiException:", err.errorCode);
      }
    } else if (err instanceof Error) {
      console.error("Unexpected error:", err.message);
    }
  }
}

// --- EVENT HANDLER: Log resolved references ----------------------------------
//
// When a message arrives, referenceMaps contains all resolved root:// URIs.
// No regex parsing needed — the platform has already done the work.

async function logReferenceMaps(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;

  if (evt.referenceMaps?.users) {
    for (const ref of evt.referenceMaps.users) {
      console.log(`Mentioned user: ${ref.name} (${ref.userId})`);
    }
  }

  if (evt.referenceMaps?.roles) {
    for (const ref of evt.referenceMaps.roles) {
      console.log(`Mentioned role: ${ref.name} (${ref.communityRoleId})`);
    }
  }

  if (evt.referenceMaps?.channels) {
    for (const ref of evt.referenceMaps.channels) {
      console.log(`Linked channel: ${ref.name} (${ref.channelId})`);
    }
  }

  if (evt.referenceMaps?.assets) {
    for (const [assetId, asset] of Object.entries(evt.referenceMaps.assets)) {
      console.log(`Referenced asset: ${assetId} (type=${asset.link.oneofKind})`);
    }
  }
}
