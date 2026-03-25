---
path: app-api-reference/server/type-aliases/Community.md
audience: app
category: reference
summary: Represents a Root community and its properties.
---

> **Community** = `object`

Represents a Root community and its properties.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier for the community.

### defaultChannelId?

> `optional` **defaultChannelId**: [`ChannelGuid`](ChannelGuid.md)

Optional channel ID for the system messages channel. When set, system messages (such as member join notifications) are posted to this channel.

### description?

> `optional` **description**: `string`

### joinThrottle?

> `optional` **joinThrottle**: [`CommunityJoinThrottle`](CommunityJoinThrottle.md)

Optional `CommunityJoinThrottle` configuration that limits how quickly new members can join.

### name

> **name**: `string`

The display name of the community.

### ownerUserId

> **ownerUserId**: [`UserGuid`](UserGuid.md)

The user ID of the community owner.

### pictureAssetUri?

> `optional` **pictureAssetUri**: `string`

Optional URI for the community's picture asset.

### pictureHex

> **pictureHex**: `string`

The hex color code used for the community picture background.

### rejectUnverifiedEmail

> **rejectUnverifiedEmail**: `boolean`

When true, users without verified email addresses cannot join this community.