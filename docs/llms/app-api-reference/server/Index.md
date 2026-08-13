---
path: app-api-reference/server/Index.md
audience: app
category: reference
---

## Enumerations

#### Assets

File uploads, images, audio, and video asset management.

- [AssetAudioCodec](enumerations/AssetAudioCodec.md) - The codec of an audio asset.
- [AssetAudioFormat](enumerations/AssetAudioFormat.md) - The container format of an audio asset.
- [AssetInvalid](enumerations/AssetInvalid.md) - The reason an asset failed processing.
- [AssetPreviewType](enumerations/AssetPreviewType.md) - The type of content represented by an `AssetPreview`.
- [AssetVideoCodec](enumerations/AssetVideoCodec.md) - The codec of a video asset.
- [AssetVideoFormat](enumerations/AssetVideoFormat.md) - The container format of a video asset.

#### Billing

Billing and subscription types.

- [BillingPaymentStatus](enumerations/BillingPaymentStatus.md) - Enumeration (Billing).
- [BillingSubscriptionInterval](enumerations/BillingSubscriptionInterval.md) - Enumeration (Billing).
- [BillingSubscriptionStatus](enumerations/BillingSubscriptionStatus.md) - Enumeration (Billing).

#### Channels

Channel and channel group management, directories, files, messages, and events.

- [ChannelDirectoryEvent](enumerations/ChannelDirectoryEvent.md) - Enum providing string constants for directory event names.
- [ChannelEvent](enumerations/ChannelEvent.md) - Enum providing string constants for channel event names.
- [ChannelFileEvent](enumerations/ChannelFileEvent.md) - Enum providing string constants for file event names.
- [ChannelGroupEvent](enumerations/ChannelGroupEvent.md) - Enum of event names for channel group changes.
- [ChannelMessageEvent](enumerations/ChannelMessageEvent.md) - Enum providing string constants for message event names.
- [ChannelType](enumerations/ChannelType.md) - Enum defining the types of channels that can be created in a community.
- [ChannelWebRtcEvent](enumerations/ChannelWebRtcEvent.md) - Enum providing string constants for voice channel event names.

#### Client

Client-side events and lifecycle types.

- [ClientEvent](enumerations/ClientEvent.md) - Enum providing string constants for client attachment event names.

#### Community

Community management, member events, roles, bans, and moderation.

- [CommunityAppLogType](enumerations/CommunityAppLogType.md) - Enum defining severity levels for community app log entries.
- [CommunityEmojiEvent](enumerations/CommunityEmojiEvent.md) - Enum providing string constants for community emoji event names.
- [CommunityEvent](enumerations/CommunityEvent.md) - Enum providing string constants for community event names.
- [CommunityLeaveReason](enumerations/CommunityLeaveReason.md) - Enum indicating why a user left a community.
- [CommunityMemberBanEvent](enumerations/CommunityMemberBanEvent.md) - Enum providing string constants for community member ban event names.
- [CommunityMemberEvent](enumerations/CommunityMemberEvent.md) - Enum providing string constants for community member event names.
- [CommunityMemberRoleEvent](enumerations/CommunityMemberRoleEvent.md) - Enum providing string constants for member role event names.
- [CommunityRoleEvent](enumerations/CommunityRoleEvent.md) - Enum providing string constants for role event names.

#### Content Moderation

Content flagging and moderation types.

- [ContentFlagReason](enumerations/ContentFlagReason.md) - Enum indicating the reason for flagging content for moderation.

#### Error Handling

Error codes and exception types.

- [ErrorCodeType](enumerations/ErrorCodeType.md) - Enumeration (Error Handling).

#### Global Settings

Community-configurable settings declared in the manifest.

- [GlobalSettingsEvent](enumerations/GlobalSettingsEvent.md) - Enumeration (Global Settings).

#### Job Scheduler

Schedule recurring or one-time tasks.

- [JobInterval](enumerations/JobInterval.md) - An enumeration that specifies the recurrence of a job in the job scheduler.
- [JobScheduleEvent](enumerations/JobScheduleEvent.md) - Enum providing string constants for job notification event names.

#### Member Groups

Member group management and events.

- [MemberGroupEvent](enumerations/MemberGroupEvent.md) - Enumeration (Member Groups).

#### Messages

Message types, directions, and related types.

- [MessageDirectionTake](enumerations/MessageDirectionTake.md) - Controls the direction of message pagination when listing messages with `ChannelMessageClient.list()`.
- [MessageType](enumerations/MessageType.md) - Enum indicating the type of message.

#### Root Core

Core types: GUIDs, exceptions, and utility classes.

- [RootGuidType](enumerations/RootGuidType.md) - Enum identifying the entity type encoded in a Root GUID.
- [RootServerExceptionType](enumerations/RootServerExceptionType.md) - Indicates the type of problem that occurred during a remote call from an App's client to its server.

#### Users

User profiles, online status, friendships, and direct messages.

- [UserOnlineStatus](enumerations/UserOnlineStatus.md) - A community member's current online status.

## Classes

- [NotificationClient](classes/NotificationClient.md) - Client for alerting community members about events in your code.
- [RootApiException](classes/RootApiException.md) - Represents an error generated by the Root API.
- [RootGuidConverter](classes/RootGuidConverter.md) - Static utility class that provides a subset of `RootGuidUtils` methods.
- [RootGuidUtils](classes/RootGuidUtils.md) - Static utility class for converting and inspecting Root GUIDs.
- [RootServerException](classes/RootServerException.md) - The only exception type that can cross the server-client boundary.

## Interfaces

- [AssetClient](interfaces/AssetClient.md) - Client for converting temporary upload tokens into permanent asset URIs.

## Type Aliases

#### Access Rules

Override channel and channel group permissions for specific roles or members.

- [AccessRule](type-aliases/AccessRule.md) - Represents a permission override for a specific role or member on a specific channel or channel group.
- [AccessRuleBulkCreateEditDeleteRequest](type-aliases/AccessRuleBulkCreateEditDeleteRequest.md) - Object type with properties: creates, deletes, edits (Access Rules).
- [AccessRuleClient](type-aliases/AccessRuleClient.md) - Service client for managing access rules that control permissions for specific roles or members on channels and channel groups.
- [AccessRuleCreateRequest](type-aliases/AccessRuleCreateRequest.md) - Request object for creating a new access rule that overrides permissions for a role or member on a channel or channel group.
- [AccessRuleCreateRoleOrMemberRequest](type-aliases/AccessRuleCreateRoleOrMemberRequest.md) - Request object for creating an access rule for a specific role or member.
- [AccessRuleDeleteRequest](type-aliases/AccessRuleDeleteRequest.md) - Request object for deleting an access rule.
- [AccessRuleEditRequest](type-aliases/AccessRuleEditRequest.md) - Request object for modifying an existing access rule's permission overlay.
- [AccessRuleGetRequest](type-aliases/AccessRuleGetRequest.md) - Request object for retrieving a single access rule.
- [AccessRuleListByChannelOrChannelGroupRequest](type-aliases/AccessRuleListByChannelOrChannelGroupRequest.md) - Request object for listing all access rules that apply to a specific channel or channel group.
- [AccessRuleListByRoleOrMemberRequest](type-aliases/AccessRuleListByRoleOrMemberRequest.md) - Request object for listing all access rules that apply to a specific role or member.
- [AccessRuleUpdateRequest](type-aliases/AccessRuleUpdateRequest.md) - Request object for batch creating, editing, and deleting access rules in a single operation.

#### App

App identity and lifecycle types.

- [AppGuid](type-aliases/AppGuid.md) - Identifies an app or bot.
- [AppStartingCallback](type-aliases/AppStartingCallback.md) - Callback invoked during app server startup, after the database initializes but before the server begins processing events.
- [AppStoppingCallback](type-aliases/AppStoppingCallback.md) - Callback invoked during graceful app server shutdown, before the server disconnects from Root's infrastructure.

#### Assets

File uploads, images, audio, and video asset management.

- [AssetAppCreateRequest](type-aliases/AssetAppCreateRequest.md) - Request to convert upload tokens into permanent asset URIs.
- [AssetAppCreateResponse](type-aliases/AssetAppCreateResponse.md) - Response containing the permanent asset URIs created from upload tokens.
- [AssetAspectRatio](type-aliases/AssetAspectRatio.md) - The aspect ratio of an image or video asset, expressed as a horizontal-to-vertical ratio.
- [AssetFile](type-aliases/AssetFile.md) - Metadata for an uploaded file asset that is not an image or video (e.g.
- [AssetGetRequest](type-aliases/AssetGetRequest.md) - Request to retrieve metadata for one or more assets.
- [AssetGetResponse](type-aliases/AssetGetResponse.md) - Response containing metadata for the requested assets.
- [AssetGuid](type-aliases/AssetGuid.md) - Identifies an uploaded asset (image, video, or file).
- [AssetImage](type-aliases/AssetImage.md) - Metadata for an uploaded image asset.
- [AssetImageLink](type-aliases/AssetImageLink.md) - A URL to an image asset at a specific resolution.
- [AssetInformation](type-aliases/AssetInformation.md) - Metadata for a single asset.
- [AssetPreview](type-aliases/AssetPreview.md) - Link preview metadata for an asset.
- [AssetPreviewAudio](type-aliases/AssetPreviewAudio.md) - Audio-specific preview metadata within an `AssetPreview`.
- [AssetPreviewImage](type-aliases/AssetPreviewImage.md) - A thumbnail image within an `AssetPreview`.
- [AssetPreviewVideo](type-aliases/AssetPreviewVideo.md) - Video-specific preview metadata within an `AssetPreview`.
- [AssetPreviewWebpage](type-aliases/AssetPreviewWebpage.md) - Webpage-specific preview metadata within an `AssetPreview`.
- [AssetVideo](type-aliases/AssetVideo.md) - Metadata for an uploaded video asset.

#### Client Attachment

Track when members are actively viewing a community.

- [AttachedClients](type-aliases/AttachedClients.md) - Query and subscribe to client attachment state for your app.

#### Broadcasting

Broadcast messages to connected clients.

- [BroadcastClientContexts](type-aliases/BroadcastClientContexts.md) - Specifies which clients receive a broadcast at the device level.
- [BroadcastClientMerged](type-aliases/BroadcastClientMerged.md) - Union of all broadcast targeting options.
- [BroadcastClients](type-aliases/BroadcastClients.md) - Specifies which clients receive a broadcast at the member level.

#### Channels

Channel and channel group management, directories, files, messages, and events.

- [Channel](type-aliases/Channel.md) - Represents a channel within a community.
- [ChannelClient](type-aliases/ChannelClient.md) - Service client for managing channels within a community.
- [ChannelCreatedEvent](type-aliases/ChannelCreatedEvent.md) - Event data emitted when a channel becomes visible to your code.
- [ChannelCreatedHandler](type-aliases/ChannelCreatedHandler.md) - Callback invoked when a channel becomes visible to your code as a side effect of an API operation.
- [ChannelCreateRequest](type-aliases/ChannelCreateRequest.md) - Request object for creating a new channel within a channel group.
- [ChannelDeletedEvent](type-aliases/ChannelDeletedEvent.md) - Event data emitted when a channel is no longer visible to your code.
- [ChannelDeletedHandler](type-aliases/ChannelDeletedHandler.md) - Callback invoked when a channel is no longer visible to your code as a side effect of an API operation.
- [ChannelDeleteRequest](type-aliases/ChannelDeleteRequest.md) - Request object for deleting a channel.
- [ChannelDirectory](type-aliases/ChannelDirectory.md) - Represents a directory (folder) within a channel's file system.
- [ChannelDirectoryClient](type-aliases/ChannelDirectoryClient.md) - Service client for managing directories (folders) within a channel's file system.
- [ChannelDirectoryCreatedEvent](type-aliases/ChannelDirectoryCreatedEvent.md) - Event payload emitted when a directory is created.
- [ChannelDirectoryCreateRequest](type-aliases/ChannelDirectoryCreateRequest.md) - Request object for creating a new directory in a channel.
- [ChannelDirectoryDeletedEvent](type-aliases/ChannelDirectoryDeletedEvent.md) - Event payload emitted when a directory is deleted.
- [ChannelDirectoryDeleteRequest](type-aliases/ChannelDirectoryDeleteRequest.md) - Request object for deleting a directory and all its contents.
- [ChannelDirectoryEditedEvent](type-aliases/ChannelDirectoryEditedEvent.md) - Event payload emitted when a directory is renamed.
- [ChannelDirectoryEditRequest](type-aliases/ChannelDirectoryEditRequest.md) - Request object for renaming a directory.
- [ChannelDirectoryEditResponse](type-aliases/ChannelDirectoryEditResponse.md) - Response object returned after renaming a directory.
- [ChannelDirectoryEvents](type-aliases/ChannelDirectoryEvents.md) - Event map type for `ChannelDirectoryClient`.
- [ChannelDirectoryGetRequest](type-aliases/ChannelDirectoryGetRequest.md) - Request object for retrieving a single directory.
- [ChannelDirectoryListRequest](type-aliases/ChannelDirectoryListRequest.md) - Request object for listing all directories in a channel.
- [ChannelDirectoryMovedEvent](type-aliases/ChannelDirectoryMovedEvent.md) - Event payload emitted when a directory is moved to a different parent.
- [ChannelDirectoryMoveRequest](type-aliases/ChannelDirectoryMoveRequest.md) - Request object for moving a directory to a different parent directory.
- [ChannelDirectoryMoveResponse](type-aliases/ChannelDirectoryMoveResponse.md) - Response object returned after moving a directory.
- [ChannelEditedEvent](type-aliases/ChannelEditedEvent.md) - Event data emitted when a visible channel's properties or permissions change.
- [ChannelEditedHandler](type-aliases/ChannelEditedHandler.md) - Callback invoked when a visible channel's properties or permissions change as a side effect of an API operation.
- [ChannelEditRequest](type-aliases/ChannelEditRequest.md) - Request object for editing an existing channel's properties.
- [ChannelEvents](type-aliases/ChannelEvents.md) - Event map type for `ChannelClient`.
- [ChannelFile](type-aliases/ChannelFile.md) - Represents a file stored within a channel directory.
- [ChannelFileClient](type-aliases/ChannelFileClient.md) - Service client for managing files within channel directories.
- [ChannelFileCreatedEvent](type-aliases/ChannelFileCreatedEvent.md) - Event payload emitted when a file is created.
- [ChannelFileCreateRequest](type-aliases/ChannelFileCreateRequest.md) - Request object for creating a new file entry in a directory.
- [ChannelFileDeletedEvent](type-aliases/ChannelFileDeletedEvent.md) - Event payload emitted when a file is deleted.
- [ChannelFileDeleteRequest](type-aliases/ChannelFileDeleteRequest.md) - Request object for deleting a file.
- [ChannelFileEditedEvent](type-aliases/ChannelFileEditedEvent.md) - Event payload emitted when a file is renamed.
- [ChannelFileEditRequest](type-aliases/ChannelFileEditRequest.md) - Request object for renaming a file.
- [ChannelFileEditResponse](type-aliases/ChannelFileEditResponse.md) - Response object returned after renaming a file.
- [ChannelFileEvents](type-aliases/ChannelFileEvents.md) - Event map type for `ChannelFileClient`.
- [ChannelFileGetRequest](type-aliases/ChannelFileGetRequest.md) - Request object for retrieving a single file.
- [ChannelFileListRequest](type-aliases/ChannelFileListRequest.md) - Request object for listing all files in a directory.
- [ChannelFileMovedEvent](type-aliases/ChannelFileMovedEvent.md) - Event payload emitted when a file is moved to a different directory.
- [ChannelFileMoveRequest](type-aliases/ChannelFileMoveRequest.md) - Request object for moving a file to a different directory.
- [ChannelFileMoveResponse](type-aliases/ChannelFileMoveResponse.md) - Response object returned after moving a file.
- [ChannelFileSearchCommunityRequest](type-aliases/ChannelFileSearchCommunityRequest.md) - Request object for searching files by name across multiple channels.
- [ChannelFileSearchCommunityResponse](type-aliases/ChannelFileSearchCommunityResponse.md) - Response object returned from a community-wide file search.
- [ChannelFileSearchRequest](type-aliases/ChannelFileSearchRequest.md) - Request object for searching files by name within a single channel.
- [ChannelFileSearchResult](type-aliases/ChannelFileSearchResult.md) - Search result for a single channel in a community-wide file search.
- [ChannelGetRequest](type-aliases/ChannelGetRequest.md) - Request object for retrieving a single channel by its ID.
- [ChannelGroup](type-aliases/ChannelGroup.md) - Represents a container that organizes channels within a community.
- [ChannelGroupClient](type-aliases/ChannelGroupClient.md) - Service client for managing channel groups within a community.
- [ChannelGroupCreatedEvent](type-aliases/ChannelGroupCreatedEvent.md) - Event payload emitted when a channel group becomes visible to your code.
- [ChannelGroupCreatedHandler](type-aliases/ChannelGroupCreatedHandler.md) - Callback invoked when a channel group becomes visible to your code as a side effect of an API operation.
- [ChannelGroupCreateRequest](type-aliases/ChannelGroupCreateRequest.md) - Request to create a new channel group in the community.
- [ChannelGroupDeletedEvent](type-aliases/ChannelGroupDeletedEvent.md) - Event payload emitted when a channel group is no longer visible to your code.
- [ChannelGroupDeletedHandler](type-aliases/ChannelGroupDeletedHandler.md) - Callback invoked when a channel group is no longer visible to your code as a side effect of an API operation.
- [ChannelGroupDeleteRequest](type-aliases/ChannelGroupDeleteRequest.md) - Request to delete a channel group.
- [ChannelGroupEditedEvent](type-aliases/ChannelGroupEditedEvent.md) - Event payload emitted when a visible channel group's properties or permissions change.
- [ChannelGroupEditedHandler](type-aliases/ChannelGroupEditedHandler.md) - Callback invoked when a visible channel group's properties or permissions change as a side effect of an API operation.
- [ChannelGroupEditRequest](type-aliases/ChannelGroupEditRequest.md) - Request to edit an existing channel group.
- [ChannelGroupEvents](type-aliases/ChannelGroupEvents.md) - Event map type for `ChannelGroupClient`.
- [ChannelGroupGetRequest](type-aliases/ChannelGroupGetRequest.md) - Request to retrieve a single channel group.
- [ChannelGroupGuid](type-aliases/ChannelGroupGuid.md) - Identifies a channel group within a community.
- [ChannelGroupMovedEvent](type-aliases/ChannelGroupMovedEvent.md) - Event payload emitted when a visible channel group is moved to a different position in the sidebar.
- [ChannelGroupMoveRequest](type-aliases/ChannelGroupMoveRequest.md) - Request to move a channel group to a different position in the sidebar.
- [ChannelGuid](type-aliases/ChannelGuid.md) - Identifies a channel within a community.
- [ChannelListRequest](type-aliases/ChannelListRequest.md) - Request object for listing all channels within a channel group.
- [ChannelMessage](type-aliases/ChannelMessage.md) - Represents a message in a channel.
- [ChannelMessageClient](type-aliases/ChannelMessageClient.md) - Service client for managing messages within channels.
- [ChannelMessageCreatedEvent](type-aliases/ChannelMessageCreatedEvent.md) - Event data emitted when a new message is created in a channel.
- [ChannelMessageCreateRequest](type-aliases/ChannelMessageCreateRequest.md) - Request object for creating a new message in a channel.
- [ChannelMessageDeletedEvent](type-aliases/ChannelMessageDeletedEvent.md) - Event payload emitted when a message is deleted from a channel.
- [ChannelMessageDeleteRequest](type-aliases/ChannelMessageDeleteRequest.md) - Request object for deleting a message from a channel.
- [ChannelMessageEditedEvent](type-aliases/ChannelMessageEditedEvent.md) - Event data emitted when a message's content is modified.
- [ChannelMessageEditRequest](type-aliases/ChannelMessageEditRequest.md) - Request object for editing an existing message.
- [ChannelMessageEvents](type-aliases/ChannelMessageEvents.md) - Event map type for `ChannelMessageClient`.
- [ChannelMessageFlagRequest](type-aliases/ChannelMessageFlagRequest.md) - Request object for flagging a message for moderation review.
- [ChannelMessageGetRequest](type-aliases/ChannelMessageGetRequest.md) - Request object for retrieving a single message by ID.
- [ChannelMessageListRequest](type-aliases/ChannelMessageListRequest.md) - Request object for listing messages in a channel with pagination.
- [ChannelMessageListResponse](type-aliases/ChannelMessageListResponse.md) - Response object returned when listing messages in a channel.
- [ChannelMessagePinCreatedEvent](type-aliases/ChannelMessagePinCreatedEvent.md) - Event payload emitted when a message is pinned in a channel.
- [ChannelMessagePinCreateRequest](type-aliases/ChannelMessagePinCreateRequest.md) - Request object for pinning a message to a channel.
- [ChannelMessagePinDeletedEvent](type-aliases/ChannelMessagePinDeletedEvent.md) - Event payload emitted when a pin is removed from a message.
- [ChannelMessagePinDeleteRequest](type-aliases/ChannelMessagePinDeleteRequest.md) - Request object for removing a pin from a message.
- [ChannelMessagePinListRequest](type-aliases/ChannelMessagePinListRequest.md) - Request object for listing pinned messages in a channel.
- [ChannelMessagePinListResponse](type-aliases/ChannelMessagePinListResponse.md) - Response object returned when listing pinned messages in a channel.
- [ChannelMessageReaction](type-aliases/ChannelMessageReaction.md) - Represents a reaction added to a message.
- [ChannelMessageReactionCreatedEvent](type-aliases/ChannelMessageReactionCreatedEvent.md) - Event payload emitted when a user adds a reaction to a message.
- [ChannelMessageReactionCreateRequest](type-aliases/ChannelMessageReactionCreateRequest.md) - Request object for adding a reaction to a message.
- [ChannelMessageReactionDeletedEvent](type-aliases/ChannelMessageReactionDeletedEvent.md) - Event payload emitted when a user removes their reaction from a message.
- [ChannelMessageReactionDeletedFullEvent](type-aliases/ChannelMessageReactionDeletedFullEvent.md) - Event payload emitted when all reactions of a given shortcode are removed from a message, regardless of which users added them.
- [ChannelMessageReactionDeleteFullRequest](type-aliases/ChannelMessageReactionDeleteFullRequest.md) - Request object for removing all reactions with a given shortcode from a message, regardless of which users added them.
- [ChannelMessageReactionDeleteRequest](type-aliases/ChannelMessageReactionDeleteRequest.md) - Request object for removing a reaction from a message.
- [ChannelMessageSetTypingIndicatorEvent](type-aliases/ChannelMessageSetTypingIndicatorEvent.md) - Event payload emitted when a user starts or stops typing in a channel.
- [ChannelMessageSetTypingIndicatorRequest](type-aliases/ChannelMessageSetTypingIndicatorRequest.md) - Request object for updating the typing indicator status in a channel.
- [ChannelMessageSetViewTimeEvent](type-aliases/ChannelMessageSetViewTimeEvent.md) - Event payload emitted when a user's last-viewed timestamp is updated for a channel.
- [ChannelMessageSetViewTimeRequest](type-aliases/ChannelMessageSetViewTimeRequest.md) - Request object for updating the last viewed timestamp in a channel.
- [ChannelMovedEvent](type-aliases/ChannelMovedEvent.md) - Event data emitted when a visible channel is moved to a different position or channel group.
- [ChannelMoveRequest](type-aliases/ChannelMoveRequest.md) - Request object for moving a channel to a different position or channel group.
- [ChannelOrChannelGroupGuid](type-aliases/ChannelOrChannelGroupGuid.md) - Identifies either a channel or a channel group.
- [ChannelOverlayPermission](type-aliases/ChannelOverlayPermission.md) - Defines permission overrides for channel-level operations.
- [ChannelPermission](type-aliases/ChannelPermission.md) - Permissions that control actions on a specific channel or its contents.
- [ChannelWebRtc](type-aliases/ChannelWebRtc.md) - Object type with properties: channelId, communityId, deviceId, isAdminDeafened, ...
- [ChannelWebRtcClient](type-aliases/ChannelWebRtcClient.md) - Service client for monitoring and moderating voice channel participants.
- [ChannelWebRtcEvents](type-aliases/ChannelWebRtcEvents.md) - Event map type for `ChannelWebRtcClient`.
- [ChannelWebRtcKickRequest](type-aliases/ChannelWebRtcKickRequest.md) - Request object for removing a participant from a voice channel.
- [ChannelWebRtcListRequest](type-aliases/ChannelWebRtcListRequest.md) - Request object for listing participants in a voice channel.
- [ChannelWebRtcListResponse](type-aliases/ChannelWebRtcListResponse.md) - Response object returned when listing voice channel participants.
- [ChannelWebRtcSetMuteAndDeafenOtherRequest](type-aliases/ChannelWebRtcSetMuteAndDeafenOtherRequest.md) - Request object for muting or deafening another user in a voice channel.
- [ChannelWebRtcUserAttachEvent](type-aliases/ChannelWebRtcUserAttachEvent.md) - Event payload emitted when a user joins a voice channel.
- [ChannelWebRtcUserDetachEvent](type-aliases/ChannelWebRtcUserDetachEvent.md) - Event payload emitted when a user leaves a voice channel.
- [ChannelWebRtcUserDeviceSetDataChannelEvent](type-aliases/ChannelWebRtcUserDeviceSetDataChannelEvent.md) - Event payload emitted when a user's data channel configuration changes in a voice channel.
- [ChannelWebRtcUserDeviceSetStatusEvent](type-aliases/ChannelWebRtcUserDeviceSetStatusEvent.md) - Event payload emitted when a user's mute or deafen state changes in a voice channel.
- [ChannelWebRtcUserDeviceSetTransportEvent](type-aliases/ChannelWebRtcUserDeviceSetTransportEvent.md) - Event payload emitted when a user enables or disables their microphone, camera, or screen sharing in a voice channel.

#### Client

Client-side events and lifecycle types.

- [Client](type-aliases/Client.md) - Represents a community member who currently has your app's channel open on one or more devices.
- [ClientContext](type-aliases/ClientContext.md) - Identifies a specific member and device.
- [ClientEvents](type-aliases/ClientEvents.md) - Event map type for `AttachedClients`.

#### Community

Community management, member events, roles, bans, and moderation.

- [Community](type-aliases/Community.md) - Represents a Root community and its properties.
- [CommunityAppGuid](type-aliases/CommunityAppGuid.md) - Identifies an app or bot installed in a specific community.
- [CommunityAppLog](type-aliases/CommunityAppLog.md) - A log entry written by an app to a community's diagnostic log.
- [CommunityAppLogClient](type-aliases/CommunityAppLogClient.md) - Client for writing diagnostic logs visible to community members with the **Manage Apps** permission.
- [CommunityAppLogCreateRequest](type-aliases/CommunityAppLogCreateRequest.md) - Request object for writing a log entry to the community's app log.
- [CommunityAppLogCreateResponse](type-aliases/CommunityAppLogCreateResponse.md) - Response object returned when creating a community app log entry.
- [CommunityBillingCoreAssignedEvent](type-aliases/CommunityBillingCoreAssignedEvent.md) - Object type with properties: communityId, coreCount, coreId, userId (Community).
- [CommunityBillingCoreRemovedEvent](type-aliases/CommunityBillingCoreRemovedEvent.md) - Object type with properties: communityId, coreCount, coreId, userId (Community).
- [CommunityClient](type-aliases/CommunityClient.md) - Service client for managing community settings and properties.
- [CommunityEditedEvent](type-aliases/CommunityEditedEvent.md) - Event data emitted when a community's properties are modified.
- [CommunityEditRequest](type-aliases/CommunityEditRequest.md) - Request object for editing a community's properties.
- [CommunityEmoji](type-aliases/CommunityEmoji.md) - Represents a custom emoji in a community.
- [CommunityEmojiClient](type-aliases/CommunityEmojiClient.md) - Service client for managing custom emojis within a community.
- [CommunityEmojiCreatedEvent](type-aliases/CommunityEmojiCreatedEvent.md) - Event payload emitted when a custom emoji is added to the community.
- [CommunityEmojiDeletedEvent](type-aliases/CommunityEmojiDeletedEvent.md) - Event payload emitted when a custom emoji is removed from the community.
- [CommunityEmojiDeleteRequest](type-aliases/CommunityEmojiDeleteRequest.md) - Request object for deleting a community emoji.
- [CommunityEmojiEvents](type-aliases/CommunityEmojiEvents.md) - Event map type for `CommunityEmojiClient`.
- [CommunityEmojiGetRequest](type-aliases/CommunityEmojiGetRequest.md) - Request object for retrieving a single community emoji.
- [CommunityEvents](type-aliases/CommunityEvents.md) - Event map type for `CommunityClient`.
- [CommunityGuid](type-aliases/CommunityGuid.md) - Identifies a community.
- [CommunityInviteLinkCodeExistsRequest](type-aliases/CommunityInviteLinkCodeExistsRequest.md) - Object type with properties: code (Community).
- [CommunityInviteLinkCodeExistsResponse](type-aliases/CommunityInviteLinkCodeExistsResponse.md) - Object type with properties: exists (Community).
- [CommunityJoinedEvent](type-aliases/CommunityJoinedEvent.md) - Event payload emitted when a user joins the community.
- [CommunityJoinThrottle](type-aliases/CommunityJoinThrottle.md) - Configuration for rate-limiting new member joins to a community.
- [CommunityLeaveEvent](type-aliases/CommunityLeaveEvent.md) - Event payload emitted when a user leaves the community, whether voluntarily, by being kicked, or by being banned.
- [CommunityLink](type-aliases/CommunityLink.md) - Object type with properties: url (Community).
- [CommunityLinkAppCreateRequest](type-aliases/CommunityLinkAppCreateRequest.md) - Object type with properties: appId, communityAppId, relativeUrl (Community).
- [CommunityLinkAppCreateResponse](type-aliases/CommunityLinkAppCreateResponse.md) - Object type with properties: url (Community).
- [CommunityLinkChannelCreateRequest](type-aliases/CommunityLinkChannelCreateRequest.md) - Object type with properties: channelId (Community).
- [CommunityLinkChannelCreateResponse](type-aliases/CommunityLinkChannelCreateResponse.md) - Object type with properties: url (Community).
- [CommunityLinkClient](type-aliases/CommunityLinkClient.md) - Type alias for `object` (Community).
- [CommunityLinkMessageRequest](type-aliases/CommunityLinkMessageRequest.md) - Object type with properties: channelId, messageId (Community).
- [CommunityLinkMessageResponse](type-aliases/CommunityLinkMessageResponse.md) - Object type with properties: url (Community).
- [CommunityMember](type-aliases/CommunityMember.md) - Represents a user's membership in a community, including their profile information, assigned roles, and membership dates.
- [CommunityMemberAttachEvent](type-aliases/CommunityMemberAttachEvent.md) - Event payload emitted every time a community member opens the community on any device.
- [CommunityMemberBan](type-aliases/CommunityMemberBan.md) - Represents a ban record for a community member.
- [CommunityMemberBanBulk](type-aliases/CommunityMemberBanBulk.md) - Response object for bulk ban operations, indicating which users were successfully banned.
- [CommunityMemberBanClient](type-aliases/CommunityMemberBanClient.md) - Service client for managing member bans and kicks within a community.
- [CommunityMemberBanCreateBulkRequest](type-aliases/CommunityMemberBanCreateBulkRequest.md) - Request object for banning multiple members from the community in a single operation.
- [CommunityMemberBanCreatedEvent](type-aliases/CommunityMemberBanCreatedEvent.md) - Event payload emitted when a user is banned from the community.
- [CommunityMemberBanCreateRequest](type-aliases/CommunityMemberBanCreateRequest.md) - Request object for banning a single member from the community.
- [CommunityMemberBanDeletedEvent](type-aliases/CommunityMemberBanDeletedEvent.md) - Event payload emitted when a ban is revoked, allowing the user to rejoin the community.
- [CommunityMemberBanDeleteRequest](type-aliases/CommunityMemberBanDeleteRequest.md) - Request object for removing a ban from a user.
- [CommunityMemberBanEvents](type-aliases/CommunityMemberBanEvents.md) - Event map type for `CommunityMemberBanClient`.
- [CommunityMemberBanGetRequest](type-aliases/CommunityMemberBanGetRequest.md) - Request object for retrieving a specific ban by user ID.
- [CommunityMemberBanGuid](type-aliases/CommunityMemberBanGuid.md) - Identifies a member ban record within a community.
- [CommunityMemberBanKickBulkRequest](type-aliases/CommunityMemberBanKickBulkRequest.md) - Request object for kicking multiple members from the community in a single operation.
- [CommunityMemberBanKickBulkResponse](type-aliases/CommunityMemberBanKickBulkResponse.md) - Response object for bulk kick operations, indicating which users were successfully kicked.
- [CommunityMemberBanKickRequest](type-aliases/CommunityMemberBanKickRequest.md) - Request object for kicking a single member from the community.
- [CommunityMemberClient](type-aliases/CommunityMemberClient.md) - Service client for retrieving information about members within a community.
- [CommunityMemberDetachEvent](type-aliases/CommunityMemberDetachEvent.md) - Event payload emitted every time a community member closes the community on any device.
- [CommunityMemberEditedEvent](type-aliases/CommunityMemberEditedEvent.md) - Event payload emitted when a community member's nickname changes.
- [CommunityMemberEvents](type-aliases/CommunityMemberEvents.md) - Event map type for `CommunityMemberClient`.
- [CommunityMemberGetRequest](type-aliases/CommunityMemberGetRequest.md) - Request object for retrieving a single community member by user ID.
- [CommunityMemberInvite](type-aliases/CommunityMemberInvite.md) - Represents a pending invitation for a user to join a community.
- [CommunityMemberInviteClient](type-aliases/CommunityMemberInviteClient.md) - Service client for managing member invitations within a community.
- [CommunityMemberInviteDeleteRequest](type-aliases/CommunityMemberInviteDeleteRequest.md) - Request object for revoking a pending member invitation.
- [CommunityMemberInviteGetRequest](type-aliases/CommunityMemberInviteGetRequest.md) - Request object for retrieving a specific member invitation.
- [CommunityMemberInviteGuid](type-aliases/CommunityMemberInviteGuid.md) - Identifies a community invite.
- [CommunityMemberListRequest](type-aliases/CommunityMemberListRequest.md) - Request object for retrieving multiple community members by their user IDs.
- [CommunityMemberRoleAddRequest](type-aliases/CommunityMemberRoleAddRequest.md) - Request object for assigning a role to one or more community members.
- [CommunityMemberRoleAddSelfRequest](type-aliases/CommunityMemberRoleAddSelfRequest.md) - Object type with properties: communityRoleId (Community).
- [CommunityMemberRoleClient](type-aliases/CommunityMemberRoleClient.md) - Service client for managing role assignments on community members.
- [CommunityMemberRoleCreatedEvent](type-aliases/CommunityMemberRoleCreatedEvent.md) - Event payload emitted when a role is assigned to one or more community members.
- [CommunityMemberRoleDeletedEvent](type-aliases/CommunityMemberRoleDeletedEvent.md) - Event payload emitted when a role is removed from one or more community members.
- [CommunityMemberRoleEvents](type-aliases/CommunityMemberRoleEvents.md) - Event map type for `CommunityMemberRoleClient`.
- [CommunityMemberRoleListRequest](type-aliases/CommunityMemberRoleListRequest.md) - Request object for listing the roles assigned to a community member.
- [CommunityMemberRoleListResponse](type-aliases/CommunityMemberRoleListResponse.md) - Response object containing the roles assigned to a community member.
- [CommunityMemberRoleRemoveRequest](type-aliases/CommunityMemberRoleRemoveRequest.md) - Request object for removing a role from one or more community members.
- [CommunityMemberRoleRemoveSelfRequest](type-aliases/CommunityMemberRoleRemoveSelfRequest.md) - Object type with properties: communityRoleId (Community).
- [CommunityMemberRoleSetPrimaryEvent](type-aliases/CommunityMemberRoleSetPrimaryEvent.md) - Event payload emitted when a member's primary role is changed.
- [CommunityMemberRoleSetPrimaryRequest](type-aliases/CommunityMemberRoleSetPrimaryRequest.md) - Request object for setting a member's primary displayed role.
- [CommunityPermission](type-aliases/CommunityPermission.md) - Permissions that control access to community-level entities and settings.
- [CommunityPermissionEditedHandler](type-aliases/CommunityPermissionEditedHandler.md) - Callback invoked when community-wide permissions change as a side effect of an API operation.
- [CommunityPermissionUpdateEvent](type-aliases/CommunityPermissionUpdateEvent.md) - Object type with properties: channelGroupsCreated, channelGroupsDeleted, channelGroupsEdited, channelGroupsMoved, ...
- [CommunityRole](type-aliases/CommunityRole.md) - Represents a role within a community.
- [CommunityRoleClient](type-aliases/CommunityRoleClient.md) - Service client for managing roles within a community.
- [CommunityRoleCreatedEvent](type-aliases/CommunityRoleCreatedEvent.md) - Event payload emitted when a new role is created in the community.
- [CommunityRoleCreateRequest](type-aliases/CommunityRoleCreateRequest.md) - Request object for creating a new role in the community.
- [CommunityRoleDeletedEvent](type-aliases/CommunityRoleDeletedEvent.md) - Event payload emitted when a role is deleted from the community.
- [CommunityRoleDeleteRequest](type-aliases/CommunityRoleDeleteRequest.md) - Request object for deleting a role from the community.
- [CommunityRoleEditedEvent](type-aliases/CommunityRoleEditedEvent.md) - Event payload emitted when a role's properties are modified.
- [CommunityRoleEditRequest](type-aliases/CommunityRoleEditRequest.md) - Request object for modifying an existing role's properties.
- [CommunityRoleEvents](type-aliases/CommunityRoleEvents.md) - Event map type for `CommunityRoleClient`.
- [CommunityRoleGetRequest](type-aliases/CommunityRoleGetRequest.md) - Request object for retrieving a single role by its ID.
- [CommunityRoleGuid](type-aliases/CommunityRoleGuid.md) - Identifies a role within a community.
- [CommunityRoleMovedEvent](type-aliases/CommunityRoleMovedEvent.md) - Event payload emitted when a role's display order changes in the community's role list.
- [CommunityRoleMoveRequest](type-aliases/CommunityRoleMoveRequest.md) - Request object for changing a role's display position.

#### Devices

Client device identification and context.

- [DeviceContext](type-aliases/DeviceContext.md) - Identifies a specific device connection.
- [DeviceGuid](type-aliases/DeviceGuid.md) - Identifies a user's device.

#### Directories

File directory organization within channels.

- [DirectoryGuid](type-aliases/DirectoryGuid.md) - Identifies a directory within a channel.

#### Files

File references and upload types.

- [FileGuid](type-aliases/FileGuid.md) - Identifies a file within a channel directory.

#### Global Settings

Community-configurable settings declared in the manifest.

- [GlobalSetting](type-aliases/GlobalSetting.md) - Union type representing any individual setting value.
- [GlobalSettingButtonEvent](type-aliases/GlobalSettingButtonEvent.md) - Event payload delivered when a community member presses a `button` setting.
- [GlobalSettingChannel](type-aliases/GlobalSettingChannel.md) - The value of a `channel` setting: `ChannelGuid[]`.
- [GlobalSettingChannelGroup](type-aliases/GlobalSettingChannelGroup.md) - The value of a `channelGroup` setting: `ChannelGroupGuid[]`.
- [GlobalSettingCheckbox](type-aliases/GlobalSettingCheckbox.md) - The value of a `checkbox` setting: `boolean`.
- [GlobalSettingColor](type-aliases/GlobalSettingColor.md) - The value of a `color` setting: `string | undefined`.
- [GlobalSettingDate](type-aliases/GlobalSettingDate.md) - The value of a `date` setting: `{ year: number, month: number, day: number }`.
- [GlobalSettingNumber](type-aliases/GlobalSettingNumber.md) - The value of a `number` setting: `number | undefined`.
- [GlobalSettingRoleOrMember](type-aliases/GlobalSettingRoleOrMember.md) - A `ReadOnlyMemberGroup` representing the roles and members selected by the community admin.
- [GlobalSettings](type-aliases/GlobalSettings.md) - Community-scoped global settings container.
- [GlobalSettingSelect](type-aliases/GlobalSettingSelect.md) - The value of a `select` setting: `string[]`.
- [GlobalSettingsEvents](type-aliases/GlobalSettingsEvents.md) - Event map type for `GlobalSettings`.
- [GlobalSettingsUpdateEvent](type-aliases/GlobalSettingsUpdateEvent.md) - Event payload delivered when a community member changes any global setting value.
- [GlobalSettingText](type-aliases/GlobalSettingText.md) - The value of a `text` setting: `string | undefined`.
- [GlobalSettingTime](type-aliases/GlobalSettingTime.md) - The value of a `time` setting: `{ hours: number, minutes: number, seconds: number }`.
- [GlobalSettingTimestamp](type-aliases/GlobalSettingTimestamp.md) - The value of a `timestamp` setting: `Date | undefined`.

#### Job Scheduler

Schedule recurring or one-time tasks.

- [JobCreateRequest](type-aliases/JobCreateRequest.md) - Encapsulates the specification of a job to be scheduled with the job scheduler.
- [JobData](type-aliases/JobData.md) - Event payload emitted when a scheduled job fires.
- [JobRecord](type-aliases/JobRecord.md) - Represents a scheduled job stored in the `JobScheduler`.
- [JobSchedule](type-aliases/JobSchedule.md) - Encapsulates the timing of a job to be scheduled with the job scheduler.
- [JobScheduleEvents](type-aliases/JobScheduleEvents.md) - Event map type for `JobScheduler`.
- [JobScheduler](type-aliases/JobScheduler.md) - Represents a job scheduling system that notifies you when it's time for one of your tasks to run.

#### Key-Value Store

Simple persistent key-value storage.

- [KeyValue](type-aliases/KeyValue.md) - Represents a key-value pair returned by `KeyValueStore.select()`.
- [KeyValueStore](type-aliases/KeyValueStore.md) - `KeyValueStore` is a key-value storage mechanism.

#### Member Groups

Member group management and events.

- [MemberGroup](type-aliases/MemberGroup.md) - A named collection of individual users and community roles combined into a single audience.
- [MemberGroupClient](type-aliases/MemberGroupClient.md) - Type alias for `MemberGroupClientBase` (Member Groups).
- [MemberGroupEmptiedEvent](type-aliases/MemberGroupEmptiedEvent.md) - Payload for the `MemberGroupServiceEvent.UserGroupEmptied` event, emitted when a member group's resolved membership becomes empty.
- [MemberGroupEvents](type-aliases/MemberGroupEvents.md) - Object type with properties: members, members, state, userGroup (Member Groups).
- [MemberGroupMembersAddedEvent](type-aliases/MemberGroupMembersAddedEvent.md) - Payload for the `MemberGroupServiceEvent.MembersAdded` event, emitted when users are added to a member group.
- [MemberGroupMembersRemovedEvent](type-aliases/MemberGroupMembersRemovedEvent.md) - Payload for the `MemberGroupServiceEvent.MembersRemoved` event, emitted when users are removed from a member group.
- [MemberGroupShort](type-aliases/MemberGroupShort.md) - Lightweight member group metadata returned by `MemberGroupService.list()`.
- [MemberGroupStateChangedEvent](type-aliases/MemberGroupStateChangedEvent.md) - Payload for the `MemberGroupServiceEvent.StateChanged` event, emitted when a member group's community role list changes.

#### Messages

Message types, directions, and related types.

- [MessageGuid](type-aliases/MessageGuid.md) - Identifies a message within a channel.
- [MessageReaction](type-aliases/MessageReaction.md) - Represents a reaction on a message, used within `ChannelMessage` objects.
- [MessageReferenceMapChannel](type-aliases/MessageReferenceMapChannel.md) - A resolved channel mention containing the channel ID and its current name.
- [MessageReferenceMapCommunityRole](type-aliases/MessageReferenceMapCommunityRole.md) - A resolved role mention containing the role ID and its current name.
- [MessageReferenceMaps](type-aliases/MessageReferenceMaps.md) - Contains resolved display names for all references in a message, including user mentions, channel mentions, role mentions, and file attachments.
- [MessageReferenceMapUser](type-aliases/MessageReferenceMapUser.md) - A resolved user mention containing the user ID and their current display name.
- [MessageUri](type-aliases/MessageUri.md) - A URI reference extracted from message content.
- [MessageUriAttachment](type-aliases/MessageUriAttachment.md) - Metadata for a file attachment referenced in a message.

#### Notifications

Notification types and delivery.

- [NotificationSendRequest](type-aliases/NotificationSendRequest.md) - Request object for sending a notification to community members.
- [NotificationSetActivityRequest](type-aliases/NotificationSetActivityRequest.md) - Request object for marking your code's channel as recently active.

#### Root Core

Core types: GUIDs, exceptions, and utility classes.

- [RootAppLifecycle](type-aliases/RootAppLifecycle.md) - Manages the startup and shutdown sequence for your app's server.
- [RootAppStartState](type-aliases/RootAppStartState.md) - Snapshot of the community's current state, passed to your `AppStartingCallback` during app server startup.
- [RootDatabaseConfig](type-aliases/RootDatabaseConfig.md) - Root-provided configuration for database access.
- [RootGuid](type-aliases/RootGuid.md) - The base type for all Root identifiers.
- [RootServer](type-aliases/RootServer.md) - This type is your entry point to most of the Root server-side APIs.
- [RootServerService](type-aliases/RootServerService.md) - A service definition object that you register with `RootAppLifecycle.addService()` to enable custom client-to-server communication.

#### Users

User profiles, online status, friendships, and direct messages.

- [UserGuid](type-aliases/UserGuid.md) - Identifies a user, app, or bot account.
- [UserSetProfileEvent](type-aliases/UserSetProfileEvent.md) - Event payload emitted when a user updates any part of their profile (picture, description, banner, or status).

#### Voice & WebRTC

Voice channel WebRTC device and user info types.

- [WebRtcUserDeviceEvent](type-aliases/WebRtcUserDeviceEvent.md) - Represents a user's device state in a WebRTC voice or video channel.
- [WebRtcUserInfoResponse](type-aliases/WebRtcUserInfoResponse.md) - Information about a participant in a voice channel session.

#### Other

- [CustomMemberGroupGuid](type-aliases/CustomMemberGroupGuid.md) - Identifies a custom member group within a community.
- [EmojiGuid](type-aliases/EmojiGuid.md) - Identifies a custom emoji within a community.
- [ParentMessage](type-aliases/ParentMessage.md) - Represents a message that another message is replying to.
- [ReadOnlyMemberGroup](type-aliases/ReadOnlyMemberGroup.md) - Read-only view of a member group.
- [RoleOrMemberGuid](type-aliases/RoleOrMemberGuid.md) - Identifies either a role, user, app, or bot.
- [TypedEventEmitter](type-aliases/TypedEventEmitter.md) - A type-safe wrapper around the standard Node.js `EventEmitter` interface.
- [UnknownGuid](type-aliases/UnknownGuid.md) - GUID string for identifying unknown entities.

## Variables

- [assetClient](variables/assetClient.md) - Constant of type `AssetClient`.
- [EmptyGuid](variables/EmptyGuid.md) - The zero-value GUID.
- [rootServer](variables/rootServer.md) - The singleton entry point for the server-side SDK.
- [WellKnownRootGuids](variables/WellKnownRootGuids.md) - Built-in GUIDs for system entities.