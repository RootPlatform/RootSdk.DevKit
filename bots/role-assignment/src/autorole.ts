import {
  rootServer,
  RootApiException,
  ErrorCodeType,
  RootBotStartState,
  RootGuidUtils,
  RootGuidType,
  MessageType,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  CommunityMemberRoleAddRequest,
  CommunityRoleGuid,
  ReadOnlyMemberGroup,
  UserGuid,
} from "@rootsdk/server-bot";

const MESSAGE_THRESHOLD = 5;

export function initializeAutorole(state: RootBotStartState): void {
  rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageCreated, onMessage);
}

async function onMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  try {
    if (evt.messageType === MessageType.System)
      return;

    if (RootGuidUtils.toRootGuidType(evt.userId) !== RootGuidType.Person)
      return;

    const setting = rootServer.globalSettings?.general?.assignedRole as ReadOnlyMemberGroup | undefined;
    const roleId: CommunityRoleGuid | undefined = setting?.communityRoleIds[0];
    if (!roleId)
      return;

    const count: number = await rootServer.dataStore.appData.update(
      evt.userId,
      (val: number) => val + 1,
      0
    );

    if (count > MESSAGE_THRESHOLD)
      return;

    if (count === MESSAGE_THRESHOLD) {
      await assignRole(evt.userId, roleId);
    }
  } catch (xcpt: unknown) {
    if (xcpt instanceof RootApiException) {
      switch (xcpt.errorCode) {
        case ErrorCodeType.TooManyRequests:
          console.error("Rate limited — commands max ~5 req/s");
          break;
        default:
          console.error("RootApiException:", xcpt.errorCode);
      }
    } else if (xcpt instanceof Error) {
      console.error("Unexpected error:", xcpt.message);
    }
  }
}

async function assignRole(userId: UserGuid, roleId: CommunityRoleGuid): Promise<void> {
  const request: CommunityMemberRoleAddRequest = {
    communityRoleId: roleId,
    userIds: [userId],
  };

  await rootServer.community.communityMemberRoles.add(request);
}
