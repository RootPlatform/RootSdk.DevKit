---
path: bot-api-reference/type-aliases/ChannelWebRtcUserDeviceSetTransportEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user enables or disables their microphone, camera, or screen sharing in a voice channel.
---

> **ChannelWebRtcUserDeviceSetTransportEvent** = `object`

Event payload emitted when a user enables or disables their microphone, camera, or screen sharing in a voice channel. This event contains the complete current state of all tracks, not just the one that changed. Multiple tracks can be active simultaneously. To detect which specific track changed, compare the new state to your previously stored state.

## Properties

### audioTrackId?

> `optional` **audioTrackId?**: `string`

The internal WebRTC track ID for the user's microphone. Optional; undefined when audio is disabled.

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the voice channel.

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### deviceId

> **deviceId**: [`DeviceGuid`](DeviceGuid.md)

The unique identifier of the user's device.

### screenAudioTrackId?

> `optional` **screenAudioTrackId?**: `string`

The internal WebRTC track ID for the user's screen share audio. Optional; undefined when not sharing screen audio.

### screenTrackId?

> `optional` **screenTrackId?**: `string`

The internal WebRTC track ID for the user's screen share video. Optional; undefined when not screen sharing.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user whose tracks changed.

### videoTrackId?

> `optional` **videoTrackId?**: `string`

The internal WebRTC track ID for the user's camera. Optional; undefined when camera is off.