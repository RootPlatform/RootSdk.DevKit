// ============================================================================
// How-To: Kick & Ban
// SDK: communityMemberBans.create, .get, .list, .delete, .kick, .createBulk, .kickBulk
// Permissions: community.createBan, community.manageBans, community.kick
// Events: CommunityMemberBanEvent.CommunityMemberBanCreated,
//         .CommunityMemberBanDeleted
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Ban, unban, kick, and query banned members. Banning removes a user and
// creates a persistent ban record. Kicking removes a user without a ban record.
//
// ============================================================================

import {
  rootServer,
  CommunityMemberBan,
  CommunityMemberBanCreateRequest,
  CommunityMemberBanCreateBulkRequest,
  CommunityMemberBanBulk,
  CommunityMemberBanDeleteRequest,
  CommunityMemberBanKickRequest,
  CommunityMemberBanKickBulkRequest,
  CommunityMemberBanKickBulkResponse,
  CommunityMemberBanGetRequest,
  CommunityMemberBanEvent,
  CommunityMemberBanCreatedEvent,
  CommunityMemberBanDeletedEvent,
  UserGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeKickBan(): void {
  const bans = rootServer.community.communityMemberBans;
  const messages = rootServer.community.channelMessages;

  // Ban events — there is no separate kick event.
  bans.on(CommunityMemberBanEvent.CommunityMemberBanCreated, onBanCreated);
  bans.on(CommunityMemberBanEvent.CommunityMemberBanDeleted, onBanDeleted);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onKickBanCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Bans a user from the community. The user is removed immediately and a
// persistent ban record is created. Cannot ban the community owner or app users.
// reason: optional, max 256 characters.
// expiresAt: optional, for temporary bans. After expiry the user can rejoin.
// Requires createBan permission on the community.
export async function banMember(
  userId: UserGuid,
  reason?: string,
  expiresAt?: Date,
): Promise<CommunityMemberBan> {
  const request: CommunityMemberBanCreateRequest = { userId, reason, expiresAt };
  return rootServer.community.communityMemberBans.create(request);
}

// Unbans a user by removing the ban record. The user is NOT automatically
// re-added to the community — they must rejoin via invite.
// Requires manageBans permission on the community.
export async function unbanMember(userId: UserGuid): Promise<void> {
  const request: CommunityMemberBanDeleteRequest = { userId };
  return rootServer.community.communityMemberBans.delete(request);
}

// Kicks a user from the community without creating a ban record.
// The user can rejoin immediately via invite.
// Cannot kick the community owner or app users.
// Requires kick permission on the community.
export async function kickMember(userId: UserGuid): Promise<void> {
  const request: CommunityMemberBanKickRequest = { userId };
  return rootServer.community.communityMemberBans.kick(request);
}

// Returns all active bans in the community.
// Requires manageBans permission on the community.
export async function listBans(): Promise<CommunityMemberBan[]> {
  return rootServer.community.communityMemberBans.list();
}

// Returns the ban record for a specific user. Throws if no ban exists.
// Requires manageBans permission on the community.
export async function getBan(userId: UserGuid): Promise<CommunityMemberBan> {
  const request: CommunityMemberBanGetRequest = { userId };
  return rootServer.community.communityMemberBans.get(request);
}

// Bans multiple users in a single call. Maximum 50 userIds per request.
// Same rules as banMember — cannot ban the community owner or app users.
// Returns the list of successfully banned userIds.
// Requires createBan permission on the community.
export async function banMembersBulk(
  userIds: UserGuid[],
  reason?: string,
  expiresAt?: Date,
): Promise<CommunityMemberBanBulk> {
  const request: CommunityMemberBanCreateBulkRequest = { userIds, reason, expiresAt };
  return rootServer.community.communityMemberBans.createBulk(request);
}

// Kicks multiple users in a single call. Maximum 50 userIds per request.
// Same rules as kickMember — no ban record created, users can rejoin immediately.
// Returns the list of successfully kicked userIds.
// Requires kick permission on the community.
export async function kickMembersBulk(
  userIds: UserGuid[],
): Promise<CommunityMemberBanKickBulkResponse> {
  const request: CommunityMemberBanKickBulkRequest = { userIds };
  return rootServer.community.communityMemberBans.kickBulk(request);
}

// --- COMMAND HANDLER: /server-kick-ban ----------------------------------------------
// Shows how to query bans. Does not actually ban/kick anyone — that would
// require a target member who can be safely removed and re-added.

async function onKickBanCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-kick-ban")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List all active bans
    const bans = await listBans();
    lines.push(`\u2713 listed ${bans.length} active ban(s)`);

    // 2. Show ban fields available
    if (bans.length > 0) {
      const ban = bans[0];
      lines.push(
        `\u2713 ban details: id=${ban.id} userId=${ban.userId} ` +
        `agentUserId=${ban.agentUserId} reason=${ban.reason ?? "none"} ` +
        `expiresAt=${ban.expiresAt ?? "permanent"}`,
      );
    }

    // 3. Show available operations
    lines.push("\u2713 operations: banMember(userId, reason?, expiresAt?)");
    lines.push("\u2713 operations: unbanMember(userId) \u2014 does NOT re-add the user");
    lines.push("\u2713 operations: kickMember(userId) \u2014 no ban record created");
    lines.push("\u2713 operations: getBan(userId), listBans()");

    // 6–7. Show bulk operations
    lines.push("\u2713 operations: banMembersBulk(userIds[], reason?, expiresAt?) \u2014 max 50");
    lines.push("\u2713 operations: kickMembersBulk(userIds[]) \u2014 max 50");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err) {
    console.error("Kick/ban demo error:", err);
    await messages.create({ channelId, content: `Kick/ban demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL ban changes from any source.
// There is no dedicated kick event — kicks are fire-and-forget.

function onBanCreated(evt: CommunityMemberBanCreatedEvent): void {
  console.log(
    `Ban created: userId=${evt.userId} reason=${evt.reason ?? "none"}`,
  );
}

function onBanDeleted(evt: CommunityMemberBanDeletedEvent): void {
  console.log(`Ban deleted (unbanned): userId=${evt.userId}`);
}
