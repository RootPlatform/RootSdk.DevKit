---
path: bot-api-reference/Index.md
audience: bot
category: reference
---

## Enumerations

#### Billing

Billing and subscription types.

- [BillingPaymentType](enumerations/BillingPaymentType.md)
- [BillingSubscriptionType](enumerations/BillingSubscriptionType.md)

#### Channels

Channel and channel group management, directories, files, messages, and events.

- [ChannelDirectoryEvent](enumerations/ChannelDirectoryEvent.md)
- [ChannelEvent](enumerations/ChannelEvent.md)
- [ChannelFileEvent](enumerations/ChannelFileEvent.md)
- [ChannelGroupEvent](enumerations/ChannelGroupEvent.md)
- [ChannelMessageEvent](enumerations/ChannelMessageEvent.md)
- [ChannelType](enumerations/ChannelType.md)
- [ChannelWebRtcEvent](enumerations/ChannelWebRtcEvent.md)

#### Community

Community management, member events, roles, bans, and moderation.

- [CommunityAppLogType](enumerations/CommunityAppLogType.md)
- [CommunityEmojiEvent](enumerations/CommunityEmojiEvent.md)
- [CommunityEvent](enumerations/CommunityEvent.md)
- [CommunityLeaveReason](enumerations/CommunityLeaveReason.md)
- [CommunityLogAction](enumerations/CommunityLogAction.md)
- [CommunityMemberBanEvent](enumerations/CommunityMemberBanEvent.md)
- [CommunityMemberEvent](enumerations/CommunityMemberEvent.md)
- [CommunityMemberRoleEvent](enumerations/CommunityMemberRoleEvent.md)
- [CommunityRoleEvent](enumerations/CommunityRoleEvent.md)

#### Content Moderation

Content flagging and moderation types.

- [ContentFlagReason](enumerations/ContentFlagReason.md)

#### Error Handling

Error codes and exception types.

- [ErrorCodeType](enumerations/ErrorCodeType.md)

#### Global Settings

Community-configurable settings declared in the manifest.

- [GlobalSettingsEvent](enumerations/GlobalSettingsEvent.md)

#### Job Scheduler

Schedule recurring or one-time tasks.

- [JobInterval](enumerations/JobInterval.md)
- [JobScheduleEvent](enumerations/JobScheduleEvent.md)

#### Member Groups

Member group management and events.

- [MemberGroupEvent](enumerations/MemberGroupEvent.md)

#### Messages

Message types, directions, and related types.

- [MessageDirectionTake](enumerations/MessageDirectionTake.md)
- [MessagePayloadAction](enumerations/MessagePayloadAction.md)
- [MessageType](enumerations/MessageType.md)
- [MessageVoteType](enumerations/MessageVoteType.md)

#### Notifications

Notification types and delivery.

- [NotificationType](enumerations/NotificationType.md)

#### Networking

Low-level packet and networking error types.

- [PacketErrorCode](enumerations/PacketErrorCode.md)
- [PacketType](enumerations/PacketType.md)

#### Root Core

Core types: GUIDs, exceptions, and utility classes.

- [RootGuidType](enumerations/RootGuidType.md)

#### Users

User profiles, online status, friendships, and direct messages.

- [UserCommunityInviteConnection](enumerations/UserCommunityInviteConnection.md)
- [UserDeviceOnlineStatus](enumerations/UserDeviceOnlineStatus.md)
- [UserDirectMessageInviteConnection](enumerations/UserDirectMessageInviteConnection.md)
- [UserFlagProperty](enumerations/UserFlagProperty.md)
- [UserFriendshipInviteConnection](enumerations/UserFriendshipInviteConnection.md)
- [UserOnlineStatus](enumerations/UserOnlineStatus.md)
- [UserType](enumerations/UserType.md)

## Classes

- [RootApiException](classes/RootApiException.md)
- [RootGuidConverter](classes/RootGuidConverter.md)
- [RootGuidUtils](classes/RootGuidUtils.md)

## Type Aliases

#### Access Rules

Override channel and channel group permissions for specific roles or members.

- [AccessRule](type-aliases/AccessRule.md)
- [AccessRuleBulkCreateEditDeleteRequest](type-aliases/AccessRuleBulkCreateEditDeleteRequest.md)
- [AccessRuleClient](type-aliases/AccessRuleClient.md)
- [AccessRuleCreateRequest](type-aliases/AccessRuleCreateRequest.md)
- [AccessRuleCreateRoleOrMemberRequest](type-aliases/AccessRuleCreateRoleOrMemberRequest.md)
- [AccessRuleDeleteRequest](type-aliases/AccessRuleDeleteRequest.md)
- [AccessRuleEditRequest](type-aliases/AccessRuleEditRequest.md)
- [AccessRuleGetRequest](type-aliases/AccessRuleGetRequest.md)
- [AccessRuleListByChannelOrChannelGroupRequest](type-aliases/AccessRuleListByChannelOrChannelGroupRequest.md)
- [AccessRuleListByRoleOrMemberRequest](type-aliases/AccessRuleListByRoleOrMemberRequest.md)
- [AccessRuleUpdateRequest](type-aliases/AccessRuleUpdateRequest.md)

#### App

App identity and lifecycle types.

- [AppGuid](type-aliases/AppGuid.md)

#### Assets

File uploads, images, audio, and video asset management.

- [AssetAspectRatio](type-aliases/AssetAspectRatio.md)
- [AssetFile](type-aliases/AssetFile.md)
- [AssetGuid](type-aliases/AssetGuid.md)
- [AssetImage](type-aliases/AssetImage.md)
- [AssetImageLink](type-aliases/AssetImageLink.md)
- [AssetInformation](type-aliases/AssetInformation.md)
- [AssetPreview](type-aliases/AssetPreview.md)
- [AssetPreviewAudio](type-aliases/AssetPreviewAudio.md)
- [AssetPreviewImage](type-aliases/AssetPreviewImage.md)
- [AssetPreviewVideo](type-aliases/AssetPreviewVideo.md)
- [AssetPreviewWebpage](type-aliases/AssetPreviewWebpage.md)
- [AssetVideo](type-aliases/AssetVideo.md)

#### Bot Lifecycle

Bot startup and lifecycle types.

- [BotStartingCallback](type-aliases/BotStartingCallback.md)
- [BotStoppingCallback](type-aliases/BotStoppingCallback.md)

#### Channels

Channel and channel group management, directories, files, messages, and events.

- [Channel](type-aliases/Channel.md)
- [ChannelClient](type-aliases/ChannelClient.md)
- [ChannelCreatedEvent](type-aliases/ChannelCreatedEvent.md)
- [ChannelCreatedHandler](type-aliases/ChannelCreatedHandler.md)
- [ChannelCreateRequest](type-aliases/ChannelCreateRequest.md)
- [ChannelDeletedEvent](type-aliases/ChannelDeletedEvent.md)
- [ChannelDeletedHandler](type-aliases/ChannelDeletedHandler.md)
- [ChannelDeleteRequest](type-aliases/ChannelDeleteRequest.md)
- [ChannelDirectory](type-aliases/ChannelDirectory.md)
- [ChannelDirectoryClient](type-aliases/ChannelDirectoryClient.md)
- [ChannelDirectoryCreatedEvent](type-aliases/ChannelDirectoryCreatedEvent.md)
- [ChannelDirectoryCreateRequest](type-aliases/ChannelDirectoryCreateRequest.md)
- [ChannelDirectoryDeletedEvent](type-aliases/ChannelDirectoryDeletedEvent.md)
- [ChannelDirectoryDeleteRequest](type-aliases/ChannelDirectoryDeleteRequest.md)
- [ChannelDirectoryEditedEvent](type-aliases/ChannelDirectoryEditedEvent.md)
- [ChannelDirectoryEditRequest](type-aliases/ChannelDirectoryEditRequest.md)
- [ChannelDirectoryEditResponse](type-aliases/ChannelDirectoryEditResponse.md)
- [ChannelDirectoryEvents](type-aliases/ChannelDirectoryEvents.md)
- [ChannelDirectoryGetRequest](type-aliases/ChannelDirectoryGetRequest.md)
- [ChannelDirectoryListRequest](type-aliases/ChannelDirectoryListRequest.md)
- [ChannelDirectoryMovedEvent](type-aliases/ChannelDirectoryMovedEvent.md)
- [ChannelDirectoryMoveRequest](type-aliases/ChannelDirectoryMoveRequest.md)
- [ChannelDirectoryMoveResponse](type-aliases/ChannelDirectoryMoveResponse.md)
- [ChannelEditedEvent](type-aliases/ChannelEditedEvent.md)
- [ChannelEditedHandler](type-aliases/ChannelEditedHandler.md)
- [ChannelEditRequest](type-aliases/ChannelEditRequest.md)
- [ChannelEvents](type-aliases/ChannelEvents.md)
- [ChannelFile](type-aliases/ChannelFile.md)
- [ChannelFileClient](type-aliases/ChannelFileClient.md)
- [ChannelFileCreatedEvent](type-aliases/ChannelFileCreatedEvent.md)
- [ChannelFileCreateRequest](type-aliases/ChannelFileCreateRequest.md)
- [ChannelFileDeletedEvent](type-aliases/ChannelFileDeletedEvent.md)
- [ChannelFileDeleteRequest](type-aliases/ChannelFileDeleteRequest.md)
- [ChannelFileEditedEvent](type-aliases/ChannelFileEditedEvent.md)
- [ChannelFileEditRequest](type-aliases/ChannelFileEditRequest.md)
- [ChannelFileEditResponse](type-aliases/ChannelFileEditResponse.md)
- [ChannelFileEvents](type-aliases/ChannelFileEvents.md)
- [ChannelFileGetRequest](type-aliases/ChannelFileGetRequest.md)
- [ChannelFileListRequest](type-aliases/ChannelFileListRequest.md)
- [ChannelFileMovedEvent](type-aliases/ChannelFileMovedEvent.md)
- [ChannelFileMoveRequest](type-aliases/ChannelFileMoveRequest.md)
- [ChannelFileMoveResponse](type-aliases/ChannelFileMoveResponse.md)
- [ChannelFileSearchCommunityRequest](type-aliases/ChannelFileSearchCommunityRequest.md)
- [ChannelFileSearchCommunityResponse](type-aliases/ChannelFileSearchCommunityResponse.md)
- [ChannelFileSearchRequest](type-aliases/ChannelFileSearchRequest.md)
- [ChannelFileSearchResult](type-aliases/ChannelFileSearchResult.md)
- [ChannelGetRequest](type-aliases/ChannelGetRequest.md)
- [ChannelGroup](type-aliases/ChannelGroup.md)
- [ChannelGroupClient](type-aliases/ChannelGroupClient.md)
- [ChannelGroupCreatedEvent](type-aliases/ChannelGroupCreatedEvent.md)
- [ChannelGroupCreatedHandler](type-aliases/ChannelGroupCreatedHandler.md)
- [ChannelGroupCreateRequest](type-aliases/ChannelGroupCreateRequest.md)
- [ChannelGroupDeletedEvent](type-aliases/ChannelGroupDeletedEvent.md)
- [ChannelGroupDeletedHandler](type-aliases/ChannelGroupDeletedHandler.md)
- [ChannelGroupDeleteRequest](type-aliases/ChannelGroupDeleteRequest.md)
- [ChannelGroupEditedEvent](type-aliases/ChannelGroupEditedEvent.md)
- [ChannelGroupEditedHandler](type-aliases/ChannelGroupEditedHandler.md)
- [ChannelGroupEditRequest](type-aliases/ChannelGroupEditRequest.md)
- [ChannelGroupEvents](type-aliases/ChannelGroupEvents.md)
- [ChannelGroupGetRequest](type-aliases/ChannelGroupGetRequest.md)
- [ChannelGroupGuid](type-aliases/ChannelGroupGuid.md)
- [ChannelGroupMovedEvent](type-aliases/ChannelGroupMovedEvent.md)
- [ChannelGroupMoveRequest](type-aliases/ChannelGroupMoveRequest.md)
- [ChannelGuid](type-aliases/ChannelGuid.md)
- [ChannelListRequest](type-aliases/ChannelListRequest.md)
- [ChannelMessage](type-aliases/ChannelMessage.md)
- [ChannelMessageClient](type-aliases/ChannelMessageClient.md)
- [ChannelMessageCreatedEvent](type-aliases/ChannelMessageCreatedEvent.md)
- [ChannelMessageCreateRequest](type-aliases/ChannelMessageCreateRequest.md)
- [ChannelMessageDeletedEvent](type-aliases/ChannelMessageDeletedEvent.md)
- [ChannelMessageDeleteRequest](type-aliases/ChannelMessageDeleteRequest.md)
- [ChannelMessageEditedEvent](type-aliases/ChannelMessageEditedEvent.md)
- [ChannelMessageEditRequest](type-aliases/ChannelMessageEditRequest.md)
- [ChannelMessageEvents](type-aliases/ChannelMessageEvents.md)
- [ChannelMessageFlagRequest](type-aliases/ChannelMessageFlagRequest.md)
- [ChannelMessageGetRequest](type-aliases/ChannelMessageGetRequest.md)
- [ChannelMessageListRequest](type-aliases/ChannelMessageListRequest.md)
- [ChannelMessageListResponse](type-aliases/ChannelMessageListResponse.md)
- [ChannelMessagePinCreatedEvent](type-aliases/ChannelMessagePinCreatedEvent.md)
- [ChannelMessagePinCreateRequest](type-aliases/ChannelMessagePinCreateRequest.md)
- [ChannelMessagePinDeletedEvent](type-aliases/ChannelMessagePinDeletedEvent.md)
- [ChannelMessagePinDeleteRequest](type-aliases/ChannelMessagePinDeleteRequest.md)
- [ChannelMessagePinListRequest](type-aliases/ChannelMessagePinListRequest.md)
- [ChannelMessagePinListResponse](type-aliases/ChannelMessagePinListResponse.md)
- [ChannelMessageReaction](type-aliases/ChannelMessageReaction.md)
- [ChannelMessageReactionCreatedEvent](type-aliases/ChannelMessageReactionCreatedEvent.md)
- [ChannelMessageReactionCreateRequest](type-aliases/ChannelMessageReactionCreateRequest.md)
- [ChannelMessageReactionDeletedEvent](type-aliases/ChannelMessageReactionDeletedEvent.md)
- [ChannelMessageReactionDeletedFullEvent](type-aliases/ChannelMessageReactionDeletedFullEvent.md)
- [ChannelMessageReactionDeleteFullRequest](type-aliases/ChannelMessageReactionDeleteFullRequest.md)
- [ChannelMessageReactionDeleteRequest](type-aliases/ChannelMessageReactionDeleteRequest.md)
- [ChannelMessageSetTypingIndicatorEvent](type-aliases/ChannelMessageSetTypingIndicatorEvent.md)
- [ChannelMessageSetTypingIndicatorRequest](type-aliases/ChannelMessageSetTypingIndicatorRequest.md)
- [ChannelMessageSetViewTimeEvent](type-aliases/ChannelMessageSetViewTimeEvent.md)
- [ChannelMessageSetViewTimeRequest](type-aliases/ChannelMessageSetViewTimeRequest.md)
- [ChannelMovedEvent](type-aliases/ChannelMovedEvent.md)
- [ChannelMoveRequest](type-aliases/ChannelMoveRequest.md)
- [ChannelOrChannelGroupGuid](type-aliases/ChannelOrChannelGroupGuid.md)
- [ChannelOverlayPermission](type-aliases/ChannelOverlayPermission.md)
- [ChannelPermission](type-aliases/ChannelPermission.md)
- [ChannelWebRtc](type-aliases/ChannelWebRtc.md)
- [ChannelWebRtcClient](type-aliases/ChannelWebRtcClient.md)
- [ChannelWebRtcEvents](type-aliases/ChannelWebRtcEvents.md)
- [ChannelWebRtcKickRequest](type-aliases/ChannelWebRtcKickRequest.md)
- [ChannelWebRtcListRequest](type-aliases/ChannelWebRtcListRequest.md)
- [ChannelWebRtcListResponse](type-aliases/ChannelWebRtcListResponse.md)
- [ChannelWebRtcSetMuteAndDeafenOtherRequest](type-aliases/ChannelWebRtcSetMuteAndDeafenOtherRequest.md)
- [ChannelWebRtcUserAttachEvent](type-aliases/ChannelWebRtcUserAttachEvent.md)
- [ChannelWebRtcUserDetachEvent](type-aliases/ChannelWebRtcUserDetachEvent.md)
- [ChannelWebRtcUserDeviceSetDataChannelEvent](type-aliases/ChannelWebRtcUserDeviceSetDataChannelEvent.md)
- [ChannelWebRtcUserDeviceSetStatusEvent](type-aliases/ChannelWebRtcUserDeviceSetStatusEvent.md)
- [ChannelWebRtcUserDeviceSetTransportEvent](type-aliases/ChannelWebRtcUserDeviceSetTransportEvent.md)

#### Community

Community management, member events, roles, bans, and moderation.

- [Community](type-aliases/Community.md)
- [CommunityAppGuid](type-aliases/CommunityAppGuid.md)
- [CommunityAppLog](type-aliases/CommunityAppLog.md)
- [CommunityAppLogClient](type-aliases/CommunityAppLogClient.md)
- [CommunityAppLogCreateRequest](type-aliases/CommunityAppLogCreateRequest.md)
- [CommunityAppLogCreateResponse](type-aliases/CommunityAppLogCreateResponse.md)
- [CommunityClient](type-aliases/CommunityClient.md)
- [CommunityEditedEvent](type-aliases/CommunityEditedEvent.md)
- [CommunityEditRequest](type-aliases/CommunityEditRequest.md)
- [CommunityEmoji](type-aliases/CommunityEmoji.md)
- [CommunityEmojiClient](type-aliases/CommunityEmojiClient.md)
- [CommunityEmojiCreatedEvent](type-aliases/CommunityEmojiCreatedEvent.md)
- [CommunityEmojiDeletedEvent](type-aliases/CommunityEmojiDeletedEvent.md)
- [CommunityEmojiDeleteRequest](type-aliases/CommunityEmojiDeleteRequest.md)
- [CommunityEmojiEvents](type-aliases/CommunityEmojiEvents.md)
- [CommunityEmojiGetRequest](type-aliases/CommunityEmojiGetRequest.md)
- [CommunityEvents](type-aliases/CommunityEvents.md)
- [CommunityGuid](type-aliases/CommunityGuid.md)
- [CommunityJoinedEvent](type-aliases/CommunityJoinedEvent.md)
- [CommunityJoinThrottle](type-aliases/CommunityJoinThrottle.md)
- [CommunityLeaveEvent](type-aliases/CommunityLeaveEvent.md)
- [CommunityMember](type-aliases/CommunityMember.md)
- [CommunityMemberAttachEvent](type-aliases/CommunityMemberAttachEvent.md)
- [CommunityMemberBan](type-aliases/CommunityMemberBan.md)
- [CommunityMemberBanBulk](type-aliases/CommunityMemberBanBulk.md)
- [CommunityMemberBanClient](type-aliases/CommunityMemberBanClient.md)
- [CommunityMemberBanCreateBulkRequest](type-aliases/CommunityMemberBanCreateBulkRequest.md)
- [CommunityMemberBanCreatedEvent](type-aliases/CommunityMemberBanCreatedEvent.md)
- [CommunityMemberBanCreateRequest](type-aliases/CommunityMemberBanCreateRequest.md)
- [CommunityMemberBanDeletedEvent](type-aliases/CommunityMemberBanDeletedEvent.md)
- [CommunityMemberBanDeleteRequest](type-aliases/CommunityMemberBanDeleteRequest.md)
- [CommunityMemberBanEvents](type-aliases/CommunityMemberBanEvents.md)
- [CommunityMemberBanGetRequest](type-aliases/CommunityMemberBanGetRequest.md)
- [CommunityMemberBanGuid](type-aliases/CommunityMemberBanGuid.md)
- [CommunityMemberBanKickBulkRequest](type-aliases/CommunityMemberBanKickBulkRequest.md)
- [CommunityMemberBanKickBulkResponse](type-aliases/CommunityMemberBanKickBulkResponse.md)
- [CommunityMemberBanKickRequest](type-aliases/CommunityMemberBanKickRequest.md)
- [CommunityMemberClient](type-aliases/CommunityMemberClient.md)
- [CommunityMemberDetachEvent](type-aliases/CommunityMemberDetachEvent.md)
- [CommunityMemberEditedEvent](type-aliases/CommunityMemberEditedEvent.md)
- [CommunityMemberEvents](type-aliases/CommunityMemberEvents.md)
- [CommunityMemberGetRequest](type-aliases/CommunityMemberGetRequest.md)
- [CommunityMemberInvite](type-aliases/CommunityMemberInvite.md)
- [CommunityMemberInviteClient](type-aliases/CommunityMemberInviteClient.md)
- [CommunityMemberInviteDeleteRequest](type-aliases/CommunityMemberInviteDeleteRequest.md)
- [CommunityMemberInviteGetRequest](type-aliases/CommunityMemberInviteGetRequest.md)
- [CommunityMemberInviteGuid](type-aliases/CommunityMemberInviteGuid.md)
- [CommunityMemberListRequest](type-aliases/CommunityMemberListRequest.md)
- [CommunityMemberRoleAddRequest](type-aliases/CommunityMemberRoleAddRequest.md)
- [CommunityMemberRoleClient](type-aliases/CommunityMemberRoleClient.md)
- [CommunityMemberRoleCreatedEvent](type-aliases/CommunityMemberRoleCreatedEvent.md)
- [CommunityMemberRoleDeletedEvent](type-aliases/CommunityMemberRoleDeletedEvent.md)
- [CommunityMemberRoleEvents](type-aliases/CommunityMemberRoleEvents.md)
- [CommunityMemberRoleListRequest](type-aliases/CommunityMemberRoleListRequest.md)
- [CommunityMemberRoleListResponse](type-aliases/CommunityMemberRoleListResponse.md)
- [CommunityMemberRoleRemoveRequest](type-aliases/CommunityMemberRoleRemoveRequest.md)
- [CommunityMemberRoleSetPrimaryEvent](type-aliases/CommunityMemberRoleSetPrimaryEvent.md)
- [CommunityMemberRoleSetPrimaryRequest](type-aliases/CommunityMemberRoleSetPrimaryRequest.md)
- [CommunityPermission](type-aliases/CommunityPermission.md)
- [CommunityPermissionEditedHandler](type-aliases/CommunityPermissionEditedHandler.md)
- [CommunityPermissionUpdateEvent](type-aliases/CommunityPermissionUpdateEvent.md)
- [CommunityRole](type-aliases/CommunityRole.md)
- [CommunityRoleClient](type-aliases/CommunityRoleClient.md)
- [CommunityRoleCreatedEvent](type-aliases/CommunityRoleCreatedEvent.md)
- [CommunityRoleCreateRequest](type-aliases/CommunityRoleCreateRequest.md)
- [CommunityRoleDeletedEvent](type-aliases/CommunityRoleDeletedEvent.md)
- [CommunityRoleDeleteRequest](type-aliases/CommunityRoleDeleteRequest.md)
- [CommunityRoleEditedEvent](type-aliases/CommunityRoleEditedEvent.md)
- [CommunityRoleEditRequest](type-aliases/CommunityRoleEditRequest.md)
- [CommunityRoleEvents](type-aliases/CommunityRoleEvents.md)
- [CommunityRoleGetRequest](type-aliases/CommunityRoleGetRequest.md)
- [CommunityRoleGuid](type-aliases/CommunityRoleGuid.md)
- [CommunityRoleMovedEvent](type-aliases/CommunityRoleMovedEvent.md)
- [CommunityRoleMoveRequest](type-aliases/CommunityRoleMoveRequest.md)

#### Devices

Client device identification and context.

- [DeviceGuid](type-aliases/DeviceGuid.md)

#### Directories

File directory organization within channels.

- [DirectoryGuid](type-aliases/DirectoryGuid.md)

#### Files

File references and upload types.

- [FileGuid](type-aliases/FileGuid.md)

#### Global Settings

Community-configurable settings declared in the manifest.

- [GlobalSetting](type-aliases/GlobalSetting.md)
- [GlobalSettingButtonEvent](type-aliases/GlobalSettingButtonEvent.md)
- [GlobalSettingChannel](type-aliases/GlobalSettingChannel.md)
- [GlobalSettingChannelGroup](type-aliases/GlobalSettingChannelGroup.md)
- [GlobalSettingCheckbox](type-aliases/GlobalSettingCheckbox.md)
- [GlobalSettingColor](type-aliases/GlobalSettingColor.md)
- [GlobalSettingDate](type-aliases/GlobalSettingDate.md)
- [GlobalSettingNumber](type-aliases/GlobalSettingNumber.md)
- [GlobalSettingRoleOrMember](type-aliases/GlobalSettingRoleOrMember.md)
- [GlobalSettings](type-aliases/GlobalSettings.md)
- [GlobalSettingSelect](type-aliases/GlobalSettingSelect.md)
- [GlobalSettingsEvents](type-aliases/GlobalSettingsEvents.md)
- [GlobalSettingsUpdateEvent](type-aliases/GlobalSettingsUpdateEvent.md)
- [GlobalSettingText](type-aliases/GlobalSettingText.md)
- [GlobalSettingTime](type-aliases/GlobalSettingTime.md)
- [GlobalSettingTimestamp](type-aliases/GlobalSettingTimestamp.md)

#### Job Scheduler

Schedule recurring or one-time tasks.

- [JobCreateRequest](type-aliases/JobCreateRequest.md)
- [JobData](type-aliases/JobData.md)
- [JobRecord](type-aliases/JobRecord.md)
- [JobSchedule](type-aliases/JobSchedule.md)
- [JobScheduleEvents](type-aliases/JobScheduleEvents.md)
- [JobScheduler](type-aliases/JobScheduler.md)

#### Key-Value Store

Simple persistent key-value storage.

- [KeyValue](type-aliases/KeyValue.md)
- [KeyValueStore](type-aliases/KeyValueStore.md)

#### Member Groups

Member group management and events.

- [MemberGroup](type-aliases/MemberGroup.md)
- [MemberGroupClient](type-aliases/MemberGroupClient.md)
- [MemberGroupEmptiedEvent](type-aliases/MemberGroupEmptiedEvent.md)
- [MemberGroupEvents](type-aliases/MemberGroupEvents.md)
- [MemberGroupMembersAddedEvent](type-aliases/MemberGroupMembersAddedEvent.md)
- [MemberGroupMembersRemovedEvent](type-aliases/MemberGroupMembersRemovedEvent.md)
- [MemberGroupShort](type-aliases/MemberGroupShort.md)
- [MemberGroupStateChangedEvent](type-aliases/MemberGroupStateChangedEvent.md)

#### Messages

Message types, directions, and related types.

- [MessageGuid](type-aliases/MessageGuid.md)
- [MessageReaction](type-aliases/MessageReaction.md)
- [MessageReferenceMapChannel](type-aliases/MessageReferenceMapChannel.md)
- [MessageReferenceMapCommunityRole](type-aliases/MessageReferenceMapCommunityRole.md)
- [MessageReferenceMaps](type-aliases/MessageReferenceMaps.md)
- [MessageReferenceMapUser](type-aliases/MessageReferenceMapUser.md)
- [MessageUri](type-aliases/MessageUri.md)
- [MessageUriAttachment](type-aliases/MessageUriAttachment.md)

#### Root Core

Core types: GUIDs, exceptions, and utility classes.

- [RootBotLifecycle](type-aliases/RootBotLifecycle.md)
- [RootBotStartState](type-aliases/RootBotStartState.md)
- [RootDatabaseConfig](type-aliases/RootDatabaseConfig.md)
- [RootGuid](type-aliases/RootGuid.md)
- [RootServer](type-aliases/RootServer.md)
- [RootServerService](type-aliases/RootServerService.md)

#### Users

User profiles, online status, friendships, and direct messages.

- [UserGuid](type-aliases/UserGuid.md)
- [UserSetProfileEvent](type-aliases/UserSetProfileEvent.md)

#### Voice & WebRTC

Voice channel WebRTC device and user info types.

- [WebRtcUserDeviceEvent](type-aliases/WebRtcUserDeviceEvent.md)
- [WebRtcUserInfoResponse](type-aliases/WebRtcUserInfoResponse.md)

#### Other

- [CustomMemberGroupGuid](type-aliases/CustomMemberGroupGuid.md)
- [EmojiGuid](type-aliases/EmojiGuid.md)
- [ParentMessage](type-aliases/ParentMessage.md)
- [ReadOnlyMemberGroup](type-aliases/ReadOnlyMemberGroup.md)
- [RoleOrMemberGuid](type-aliases/RoleOrMemberGuid.md)
- [TypedEventEmitter](type-aliases/TypedEventEmitter.md)
- [UnknownGuid](type-aliases/UnknownGuid.md)

## Variables

- [EmptyGuid](variables/EmptyGuid.md)
- [rootServer](variables/rootServer.md)
- [WellKnownRootGuids](variables/WellKnownRootGuids.md)