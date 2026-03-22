// ============================================================================
// How-To: GUID Utilities
// SDK: RootGuidUtils, RootGuidConverter, RootGuidType, WellKnownRootGuids
// Permissions: channel.createMessage (for the /guid-utils self-test command)
// Events: ChannelMessageCreated (for command trigger)
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Every entity on the Root platform has a GUID (globally unique identifier).
// GUIDs encode their type and creation timestamp. These utilities let you
// inspect, classify, and work with GUIDs without making any API calls.
//
// RootGuidUtils      — extract type and timestamp from any GUID
// RootGuidConverter  — normalize GUIDs between base64 and UUID string formats
// RootGuidType       — enum of all GUID types (Person, App, Channel, etc.)
// WellKnownRootGuids — platform constants (e.g., the @everyone role GUID)
//
// Common use cases:
//   - Determine if a userId is a human (Person) or a bot/app (App)
//   - Extract creation timestamps from GUIDs for ordering or display
//   - Identify the @everyone role without querying the API
//
// ============================================================================

import {
  rootServer,
  RootGuidUtils,
  RootGuidConverter,
  RootGuidType,
  WellKnownRootGuids,
  UserGuid,
  CommunityRoleGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeGuidUtils(): void {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onGuidUtilsCommand,
  );
}

// --- GUID TYPE INSPECTION ----------------------------------------------------

// RootGuidUtils.toRootGuidType() extracts the entity type from any GUID.
// Returns a RootGuidType enum value. No API call needed.
//
// Key values for bot developers:
//   RootGuidType.Person = 1  — a human user
//   RootGuidType.App    = 9  — a bot or app
//   RootGuidType.Community = 2, Channel = 4, ChannelGroup = 5,
//   CommunityRole = 11, Message = 3, File = 12, Asset = 27, Emoji = 35
//
// The full enum has 30+ values covering every entity type on the platform.
export function isBot(userId: UserGuid): boolean {
  return RootGuidUtils.toRootGuidType(userId) === RootGuidType.App;
}

export function isHuman(userId: UserGuid): boolean {
  return RootGuidUtils.toRootGuidType(userId) === RootGuidType.Person;
}

export function getGuidTypeName(guid: string): string {
  const guidType = RootGuidUtils.toRootGuidType(guid);
  return RootGuidType[guidType] ?? `Unknown(${guidType})`;
}

// --- GUID TIMESTAMP EXTRACTION -----------------------------------------------

// RootGuidUtils.toMilliseconds() extracts the creation timestamp from any GUID.
// The returned value is compatible with the JavaScript Date constructor.
export function getCreatedDate(guid: string): Date {
  return new Date(RootGuidUtils.toMilliseconds(guid));
}

// --- GUID FORMAT CONVERSION --------------------------------------------------

// RootGuidConverter.parse() normalizes a GUID string to the canonical base64
// format (22 characters). It accepts both base64 GUIDs and standard UUID format
// (36 characters with hyphens, e.g., "002db54e-13b5-8109-87ac-e188bb6688e6").
//
// Use this when you receive GUIDs from external systems in UUID format and need
// to convert them to the Root base64 format for SDK calls.
//
// RootGuidConverter also exposes toRootGuidType() and toMilliseconds() as
// convenience aliases for the same methods on RootGuidUtils.
export function toUuidString(guid: string): string {
  return RootGuidUtils.toUuidString(guid);
}

export function fromUuidString(uuid: string): string {
  return RootGuidConverter.parse(uuid) as unknown as string;
}

// --- WELL-KNOWN GUIDS --------------------------------------------------------

// WellKnownRootGuids provides platform-defined GUID constants.
// Currently available:
//   WellKnownRootGuids.CommunityRoles.EveryoneRole — the @everyone role GUID
//
// Every community has this role and every member is assigned to it.
// Use it to identify the default role when iterating or filtering roles.
export function isEveryoneRole(roleId: CommunityRoleGuid): boolean {
  return roleId === WellKnownRootGuids.CommunityRoles.EveryoneRole;
}

// --- COMMAND HANDLER: /guid-utils --------------------------------------------
// Self-test: exercises all GUID utility functions using real GUIDs from the
// current event and community state.

async function onGuidUtilsCommand(
  evt: ChannelMessageCreatedEvent,
): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/guid-utils")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // --- toRootGuidType: identify entity types from GUIDs ---

    // The user who sent the command (should be Person)
    const senderType = RootGuidUtils.toRootGuidType(evt.userId);
    lines.push(
      `\u2713 sender type: ${RootGuidType[senderType]} (${senderType})`,
    );

    // The channel this was sent in (should be Channel)
    const channelType = RootGuidUtils.toRootGuidType(channelId);
    lines.push(
      `\u2713 channel type: ${RootGuidType[channelType]} (${channelType})`,
    );

    // The message itself (should be Message)
    const messageType = RootGuidUtils.toRootGuidType(evt.id);
    lines.push(
      `\u2713 message type: ${RootGuidType[messageType]} (${messageType})`,
    );

    // --- isBot / isHuman helper using toRootGuidType ---
    lines.push(
      `\u2713 sender isBot=${isBot(evt.userId)} isHuman=${isHuman(evt.userId)}`,
    );

    // --- toMilliseconds: extract creation timestamps ---
    const messageDate = getCreatedDate(evt.id);
    lines.push(`\u2713 message created: ${messageDate.toISOString()}`);

    const channelDate = getCreatedDate(channelId);
    lines.push(`\u2713 channel created: ${channelDate.toISOString()}`);

    // --- RootGuidConverter: format conversion ---
    // Convert a Root base64 GUID to standard UUID format and back.
    const uuidStr = toUuidString(evt.userId);
    lines.push(`\u2713 toUuidString: ${uuidStr}`);

    const roundTripped = fromUuidString(uuidStr);
    const matches = roundTripped === (evt.userId as string);
    lines.push(`\u2713 parse (round-trip): matches=${matches}`);

    // --- WellKnownRootGuids: identify the @everyone role ---
    const roles = await rootServer.community.communityRoles.list();
    const everyoneRole = roles.find((r) => isEveryoneRole(r.id));
    lines.push(
      `\u2713 @everyone role: ${everyoneRole ? everyoneRole.name : "not found"} ` +
      `(${WellKnownRootGuids.CommunityRoles.EveryoneRole})`,
    );

    // Show the type of the @everyone role GUID for completeness
    if (everyoneRole) {
      const roleType = RootGuidUtils.toRootGuidType(everyoneRole.id);
      lines.push(
        `\u2713 @everyone role type: ${RootGuidType[roleType]} (${roleType})`,
      );
    }

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err) {
    console.error("GUID utils demo error:", err);
    await messages.create({
      channelId,
      content: `GUID utils demo error: ${err}`,
    });
  }
}
