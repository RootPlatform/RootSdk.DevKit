---
path: bot-api-reference/type-aliases/CommunityEditedEvent.md
audience: bot
category: reference
summary: Event data emitted when a community's properties are modified.
---

> **CommunityEditedEvent** = `object`

Event data emitted when a community's properties are modified.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### defaultChannelId?

> `optional` **defaultChannelId?**: [`ChannelGuid`](ChannelGuid.md)

Optional channel ID for the system messages channel.

### description?

> `optional` **description?**: `string`

### isAgeRestricted

> **isAgeRestricted**: `boolean`

### joinThrottle?

> `optional` **joinThrottle?**: [`CommunityJoinThrottle`](CommunityJoinThrottle.md)

Optional updated `CommunityJoinThrottle` configuration.

### name

> **name**: `string`

The updated name of the community.

### ownerUserId

> **ownerUserId**: [`UserGuid`](UserGuid.md)

The user ID of the community owner.

### pictureAssetUri?

> `optional` **pictureAssetUri?**: `string`

Optional updated URI for the community's picture asset.

### pictureHex

> **pictureHex**: `string`

The updated hex color code for the community picture background.

### rejectUnverifiedEmail

> **rejectUnverifiedEmail**: `boolean`

Whether users without verified email addresses are rejected from joining.