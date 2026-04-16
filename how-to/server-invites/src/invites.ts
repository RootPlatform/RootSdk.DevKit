// ============================================================================
// How-To: Invites
// SDK: communityMemberInvites.get, .list, .delete
// Permissions: community.manageInvites
// Events: None
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Get, list, and delete community member invites. This client manages
// existing invites — there is no create method in the SDK. Invites are
// created through the Root platform UI or other mechanisms.
//
// ============================================================================

import {
  rootServer,
  CommunityMemberInvite,
  CommunityMemberInviteDeleteRequest,
  CommunityMemberInviteGetRequest,
  UserGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  ChannelGuid,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeInvites(): void {
  const messages = rootServer.community.channelMessages;

  // CommunityMemberInviteClient has no events.

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onInvitesCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Returns a specific invite by its composite key: (invitedUserId, senderUserId).
// Throws if no matching invite exists.
// Requires manageInvites permission on the community.
export async function getInvite(
  invitedUserId: UserGuid,
  senderUserId: UserGuid,
): Promise<CommunityMemberInvite> {
  const request: CommunityMemberInviteGetRequest = { invitedUserId, senderUserId };
  return rootServer.community.communityMemberInvites.get(request);
}

// Returns all pending invites in the community. No parameters needed.
// Returns empty array if no invites exist (not an error).
// Requires manageInvites permission on the community.
export async function listInvites(): Promise<CommunityMemberInvite[]> {
  return rootServer.community.communityMemberInvites.list();
}

// Deletes (revokes) an invite. Not idempotent — calling delete on an already-
// deleted invite throws an error. Deleting does NOT create a membership.
// Requires manageInvites permission on the community.
export async function deleteInvite(
  invitedUserId: UserGuid,
  senderUserId: UserGuid,
): Promise<void> {
  const request: CommunityMemberInviteDeleteRequest = { invitedUserId, senderUserId };
  return rootServer.community.communityMemberInvites.delete(request);
}

// --- COMMAND HANDLER: /server-invites -----------------------------------------------
// Lists pending invites and shows available invite fields.

async function onInvitesCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-invites")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List all pending invites
    const invites: CommunityMemberInvite[] = await listInvites();
    lines.push(`\u2713 listed ${invites.length} pending invite(s)`);

    // 2. Show invite details if any exist
    if (invites.length > 0) {
      const invite: CommunityMemberInvite = invites[0];
      lines.push(
        `\u2713 invite details: id=${invite.id} invitedUser=${invite.invitedUsername} ` +
        `sender=${invite.senderUserId} roles=${invite.communityRoleIds?.length ?? 0}`,
      );

      // 3. Get the same invite by composite key
      const fetched: CommunityMemberInvite = await getInvite(invite.invitedUserId, invite.senderUserId);
      lines.push(`\u2713 fetched invite by key: ${fetched.invitedUsername}`);
    }

    // 4. Show available operations
    lines.push("\u2713 operations: getInvite(invitedUserId, senderUserId)");
    lines.push("\u2713 operations: listInvites()");
    lines.push("\u2713 operations: deleteInvite(invitedUserId, senderUserId) \u2014 revokes invite");
    lines.push("\u2713 note: no create method \u2014 invites are created via the Root platform");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    console.error("Invites demo error:", err);
    await messages.create({ channelId, content: `Invites demo error: ${err}` });
  }
}
