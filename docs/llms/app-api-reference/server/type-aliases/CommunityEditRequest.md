---
path: app-api-reference/server/type-aliases/CommunityEditRequest.md
audience: app
category: reference
summary: Request object for editing a community's properties.
---

> **CommunityEditRequest** = `object`

Request object for editing a community's properties.

## Properties

### defaultChannelId?

> `optional` **defaultChannelId**: [`ChannelGuid`](ChannelGuid.md)

Optional channel ID for the system messages channel. When set, system messages (such as member join notifications) are posted to this channel. Set to undefined to disable system messages.

### description?

> `optional` **description**: `string`

### isAgeRestricted

> **isAgeRestricted**: `boolean`

### joinThrottle?

> `optional` **joinThrottle**: [`CommunityJoinThrottle`](CommunityJoinThrottle.md)

Optional `CommunityJoinThrottle` configuration to limit how quickly new members can join. The `joinThrottle` fields `refillCount` and `windowInMinutes` must both be greater than zero. Zero values are rejected by the server.

### name

> **name**: `string`

The new name for the community. Required.

### pictureHex

> **pictureHex**: `string`

The hex color code for the community picture background. Required.

### pictureTokenUri?

> `optional` **pictureTokenUri**: `string`

Optional token URI for the community picture. Only used when `updatePicture` is true. Obtain this value from the asset upload process.

### rejectUnverifiedEmail

> **rejectUnverifiedEmail**: `boolean`

When true, users without verified email addresses cannot join the community. Required.

### updatePicture

> **updatePicture**: `boolean`

Set to true if the picture should be updated. Required. Must be true even when clearing the picture.  When set to `false`, any values provided for `pictureHex` and `pictureTokenUri` are ignored. Set it to `true` when changing the community picture.