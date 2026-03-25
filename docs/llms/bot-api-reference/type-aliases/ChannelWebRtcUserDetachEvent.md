---
path: bot-api-reference/type-aliases/ChannelWebRtcUserDetachEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user leaves a voice channel.
---

> **ChannelWebRtcUserDetachEvent** = `object`

Event payload emitted when a user leaves a voice channel.

## Properties

### audioTrackId?

> `optional` **audioTrackId**: `string`

The internal WebRTC track ID for the user's microphone. Optional.

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the voice channel.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### deviceId

> **deviceId**: [`DeviceGuid`](DeviceGuid.md)

The unique identifier of the user's device.

### isKick

> **isKick**: `boolean`

Whether the user was kicked from the channel. When `false`, the user left voluntarily.

### screenAudioTrackId?

> `optional` **screenAudioTrackId**: `string`

The internal WebRTC track ID for the user's screen share audio. Optional.

### screenTrackId?

> `optional` **screenTrackId**: `string`

The internal WebRTC track ID for the user's screen share video. Optional.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who left.

### videoTrackId?

> `optional` **videoTrackId**: `string`

The internal WebRTC track ID for the user's camera. Optional.