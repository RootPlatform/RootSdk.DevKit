---
path: app-api-reference/client/Index.md
audience: app
category: reference
---

## Enumerations

- [CommunityUserOnlineStatus](enumerations/CommunityUserOnlineStatus.md) - The computed online status of a community member as seen by the current user.
- [ImageUriResolution](enumerations/ImageUriResolution.md) - Enum controlling which resolution variant of an image is requested from `rootClient.assets.toImageUrl()`.
- [RootClientThemeEvent](enumerations/RootClientThemeEvent.md) - Enum providing string constants for theme event names.
- [RootClientUserEvent](enumerations/RootClientUserEvent.md) - Enum providing string constants for user event names.
- [RootGuidType](enumerations/RootGuidType.md) - Enum identifying the entity type encoded in a Root GUID.
- [RootServerExceptionType](enumerations/RootServerExceptionType.md) - Indicates the type of problem that occurred during a remote call from an App's client to its server.

## Classes

- [RootGuidUtils](classes/RootGuidUtils.md) - Static utility class for converting and inspecting Root GUIDs.
- [RootServerException](classes/RootServerException.md) - The only exception type that can cross the server-client boundary.
- [UserRoleSelector](classes/UserRoleSelector.md) - A searchable dropdown component for selecting users and community roles.

## Type Aliases

#### App

App identity and lifecycle types.

- [AppGuid](type-aliases/AppGuid.md) - Identifies an app or bot.

#### Assets

File uploads, images, audio, and video asset management.

- [AssetGuid](type-aliases/AssetGuid.md) - Identifies an uploaded asset (image, video, or file).

#### Channels

Channel and channel group management, directories, files, messages, and events.

- [ChannelGroupGuid](type-aliases/ChannelGroupGuid.md) - Identifies a channel group within a community.
- [ChannelGuid](type-aliases/ChannelGuid.md) - Identifies a channel within a community.

#### Community

Community management, member events, roles, bans, and moderation.

- [CommunityAppGuid](type-aliases/CommunityAppGuid.md) - Identifies an app or bot installed in a specific community.
- [CommunityGuid](type-aliases/CommunityGuid.md) - Identifies a community.
- [CommunityMemberBanGuid](type-aliases/CommunityMemberBanGuid.md) - Identifies a member ban record within a community.
- [CommunityMemberInviteGuid](type-aliases/CommunityMemberInviteGuid.md) - Identifies a community invite.
- [CommunityRoleGuid](type-aliases/CommunityRoleGuid.md) - Identifies a role within a community.

#### Devices

Client device identification and context.

- [DeviceGuid](type-aliases/DeviceGuid.md) - Identifies a user's device.

#### Directories

File directory organization within channels.

- [DirectoryGuid](type-aliases/DirectoryGuid.md) - Identifies a directory within a channel.

#### Files

File references and upload types.

- [FileGuid](type-aliases/FileGuid.md) - Identifies a file within a channel directory.
- [FileUploadRequest](type-aliases/FileUploadRequest.md) - Request object for `rootClient.assets.fileUpload()`.
- [FileUploadResponse](type-aliases/FileUploadResponse.md) - Response from `rootClient.assets.fileUpload()`.
- [FileUploadType](type-aliases/FileUploadType.md) - Restricts which file types the user can select in the file picker opened by `rootClient.assets.fileUpload()`.

#### Messages

Message types, directions, and related types.

- [MessageGuid](type-aliases/MessageGuid.md) - Identifies a message within a channel.

#### Root Core

Core types: GUIDs, exceptions, and utility classes.

- [RootClient](type-aliases/RootClient.md) - This type is your entry point to the Root client-side APIs.
- [RootClientAsset](type-aliases/RootClientAsset.md) - Provides methods for uploading files and converting asset URIs into displayable URLs.
- [RootClientLifecycle](type-aliases/RootClientLifecycle.md) - Lifecycle methods for your app's client-side component.
- [RootClientService](type-aliases/RootClientService.md) - Base type that generated client-side service classes implement.
- [RootClientTheme](type-aliases/RootClientTheme.md) - Provides access to the host Root client's current theme.
- [RootClientThemeEvents](type-aliases/RootClientThemeEvents.md) - Event map type for `RootClientTheme`.
- [RootClientUser](type-aliases/RootClientUser.md) - Provides access to community member profiles.
- [RootGuid](type-aliases/RootGuid.md) - The base type for all Root identifiers.
- [RootThemeMode](type-aliases/RootThemeMode.md) - The host Root client's current theme: `"light"` or `"dark"`.

#### Users

User profiles, online status, friendships, and direct messages.

- [UserGuid](type-aliases/UserGuid.md) - Identifies a user, app, or bot account.
- [UserProfile](type-aliases/UserProfile.md) - A community member's profile as seen by the current user.

#### Other

- [CustomMemberGroupGuid](type-aliases/CustomMemberGroupGuid.md) - Identifies a custom member group within a community.
- [RoleOrMemberGuid](type-aliases/RoleOrMemberGuid.md) - Identifies either a role, user, app, or bot.
- [TypedEventEmitter](type-aliases/TypedEventEmitter.md) - A type-safe wrapper around the standard Node.js `EventEmitter` interface.

## Variables

- [EmptyGuid](variables/EmptyGuid.md) - The zero-value GUID.
- [rootClient](variables/rootClient.md) - The singleton entry point for the client-side SDK.