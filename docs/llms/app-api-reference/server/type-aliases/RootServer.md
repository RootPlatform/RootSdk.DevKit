---
path: app-api-reference/server/type-aliases/RootServer.md
audience: app
category: reference
summary: This type is your entry point to most of the Root server-side APIs. Root automatically creates an instance of this type and provides it for your use.
---

> **RootServer** = `object`

This type is your entry point to most of the Root server-side APIs. Root automatically creates an instance of this type and provides it for your use. You import the instance and access its properties.

## Properties

### appId

> **appId**: [`AppGuid`](AppGuid.md)

Your app or bot's globally unique identifier, matching the `id` in your `root-manifest.json`. Use this when you need to reference your own application, for example when filtering results or correlating data that includes an `AppGuid`.

### clients

> **clients**: [`AttachedClients`](AttachedClients.md)

Represents community members who currently have your app's channel open. Provides methods to query attached members and events to track attachment changes.

### community

> **community**: `object`

Represents the community where your code is installed. Provides an API to manipulate the community (e.g., create channels or send messages) and events to notify you when things in the community change (e.g., message sent or new member joins).

#### accessRules

> **accessRules**: [`AccessRuleClient`](AccessRuleClient.md)

#### channelDirectories

> **channelDirectories**: [`ChannelDirectoryClient`](ChannelDirectoryClient.md)

#### channelFiles

> **channelFiles**: [`ChannelFileClient`](ChannelFileClient.md)

#### channelGroups

> **channelGroups**: [`ChannelGroupClient`](ChannelGroupClient.md)

#### channelMessages

> **channelMessages**: [`ChannelMessageClient`](ChannelMessageClient.md)

#### channels

> **channels**: [`ChannelClient`](ChannelClient.md)

#### channelWebRtcs

> **channelWebRtcs**: [`ChannelWebRtcClient`](ChannelWebRtcClient.md)

#### communities

> **communities**: [`CommunityClient`](CommunityClient.md)

#### communityEmojis

> **communityEmojis**: [`CommunityEmojiClient`](CommunityEmojiClient.md)

#### communityLinks

> **communityLinks**: [`CommunityLinkClient`](CommunityLinkClient.md)

#### communityMemberBans

> **communityMemberBans**: [`CommunityMemberBanClient`](CommunityMemberBanClient.md)

#### communityMemberInvites

> **communityMemberInvites**: [`CommunityMemberInviteClient`](CommunityMemberInviteClient.md)

#### communityMemberRoles

> **communityMemberRoles**: [`CommunityMemberRoleClient`](CommunityMemberRoleClient.md)

#### communityMembers

> **communityMembers**: [`CommunityMemberClient`](CommunityMemberClient.md)

#### communityRoles

> **communityRoles**: [`CommunityRoleClient`](CommunityRoleClient.md)

#### notifications

> **notifications**: [`NotificationClient`](../classes/NotificationClient.md)

### dataStore

> **dataStore**: `object`

This property groups together all your server-side persistence APIs. All the options store data on the server side except the logs. The messages you write to the logs will be available to community admins.

#### appData

> **appData**: [`KeyValueStore`](KeyValueStore.md)

#### assets

> **assets**: [`AssetClient`](../interfaces/AssetClient.md)

#### config

> **config**: [`RootDatabaseConfig`](RootDatabaseConfig.md)

#### logs

> **logs**: `object`

##### logs.community

> **community**: [`CommunityAppLogClient`](CommunityAppLogClient.md)

### globalSettings

> **globalSettings**: [`GlobalSettings`](GlobalSettings.md) | `undefined`

Settings configured by the community in the Root client. Your server reads the current values and listens for changes via `update` and `button` events. This property is `undefined` when your manifest does not declare global settings.

### jobScheduler

> **jobScheduler**: [`JobScheduler`](JobScheduler.md)

A service for scheduling tasks that need to execute at future date(s). The job scheduler notifies you via an event when it's time for your job to run.

### lifecycle

> **lifecycle**: [`RootAppLifecycle`](RootAppLifecycle.md)

Lifecycle methods for your server-side component.

### memberGroups

> **memberGroups**: [`MemberGroupClient`](MemberGroupClient.md)

Manages custom groups of community members and roles. Use member groups to define broadcast audiences or organize access control.