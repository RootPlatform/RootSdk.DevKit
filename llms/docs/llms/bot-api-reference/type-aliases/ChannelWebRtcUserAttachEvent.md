---
path: bot-api-reference/type-aliases/ChannelWebRtcUserAttachEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user joins a voice channel.
---

> **ChannelWebRtcUserAttachEvent** = `object`

Event payload emitted when a user joins a voice channel.

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

### dataChannelName?

> `optional` **dataChannelName**: `string`

The name of the user's data channel. Optional.

### deviceId

> **deviceId**: [`DeviceGuid`](DeviceGuid.md)

The unique identifier of the user's device.

### isAdminDeafened

> **isAdminDeafened**: `boolean`

Whether the user is server-deafened.

### isAdminMuted

> **isAdminMuted**: `boolean`

Whether the user is server-muted.

### isDeafened

> **isDeafened**: `boolean`

Whether the user joined in a deafened state.

### isMuted

> **isMuted**: `boolean`

Whether the user joined in a muted state.

### screenAudioTrackId?

> `optional` **screenAudioTrackId**: `string`

The internal WebRTC track ID for the user's screen share audio. Optional.

### screenTrackId?

> `optional` **screenTrackId**: `string`

The internal WebRTC track ID for the user's screen share video. Optional.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who joined.

### videoTrackId?

> `optional` **videoTrackId**: `string`

The internal WebRTC track ID for the user's camera. Optional.