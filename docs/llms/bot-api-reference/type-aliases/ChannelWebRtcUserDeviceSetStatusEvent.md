---
path: bot-api-reference/type-aliases/ChannelWebRtcUserDeviceSetStatusEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user's mute or deafen state changes in a voice channel.
---

> **ChannelWebRtcUserDeviceSetStatusEvent** = `object`

Event payload emitted when a user's mute or deafen state changes in a voice channel. This event covers control state changes only; for audio/video track changes (microphone, camera, screen share), see `ChannelWebRtcUserDeviceSetTransportEvent`.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the voice channel.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### deviceId

> **deviceId**: [`DeviceGuid`](DeviceGuid.md)

The unique identifier of the user's device.

### isAdminDeafened

> **isAdminDeafened**: `boolean`

Whether the user has been deafened by an app or moderator.

### isAdminMuted

> **isAdminMuted**: `boolean`

Whether the user has been muted by an app or moderator.

### isDeafened

> **isDeafened**: `boolean`

Whether the user is currently deafened.

### isMuted

> **isMuted**: `boolean`

Whether the user is currently muted.

### isScreenPaused

> **isScreenPaused**: `boolean`

### isVideoPaused

> **isVideoPaused**: `boolean`

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user whose status changed.