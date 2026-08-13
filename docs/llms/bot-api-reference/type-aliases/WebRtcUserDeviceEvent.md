---
path: bot-api-reference/type-aliases/WebRtcUserDeviceEvent.md
audience: bot
category: reference
summary: Represents a user's device state in a WebRTC voice or video channel.
---

> **WebRtcUserDeviceEvent** = `object`

Represents a user's device state in a WebRTC voice or video channel. Included in the `webRtcMembers` array on channel events to describe who is currently connected and their audio/video status.

| Property | Type | Description |
|----------|------|-------------|
| `communityId` | `CommunityGuid` | _(Optional)_ The community the channel belongs to. |
| `channelId` | `ChannelGuid` | The channel the user is connected to. |
| `userId` | `UserGuid` | The connected user. |
| `deviceId` | `DeviceGuid` | The unique identifier of the user's device connected to voice. |
| `isMuted` | `boolean` | Whether the user has muted themselves. |
| `isAdminMuted` | `boolean` | Whether the user has been muted by an app or moderator. When true, the user cannot unmute themselves. |
| `isDeafened` | `boolean` | Whether the user has deafened themselves. |
| `isAdminDeafened` | `boolean` | Whether the user has been deafened by an app or moderator. When true, the user cannot undeafen themselves. |
| `audioTrackId` | `string` | _(Optional)_ The internal WebRTC track ID for the user's microphone. Undefined when audio is disabled. |
| `videoTrackId` | `string` | _(Optional)_ The internal WebRTC track ID for the user's camera. Undefined when camera is off. |
| `screenTrackId` | `string` | _(Optional)_ The internal WebRTC track ID for the user's screen share video. Undefined when not screen sharing. |
| `screenAudioTrackId` | `string` | _(Optional)_ The internal WebRTC track ID for the user's screen share audio. Undefined when not sharing screen audio. |
| `dataChannelName` | `string` | _(Optional)_ The name of the user's data channel. |

## Properties

### audioTrackId?

> `optional` **audioTrackId?**: `string`

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

### dataChannelName?

> `optional` **dataChannelName?**: `string`

### deviceId

> **deviceId**: [`DeviceGuid`](DeviceGuid.md)

### isAdminDeafened

> **isAdminDeafened**: `boolean`

### isAdminMuted

> **isAdminMuted**: `boolean`

### isDeafened

> **isDeafened**: `boolean`

### isMuted

> **isMuted**: `boolean`

### isScreenPaused

> **isScreenPaused**: `boolean`

### isVideoPaused

> **isVideoPaused**: `boolean`

### screenAudioTrackId?

> `optional` **screenAudioTrackId?**: `string`

### screenTrackId?

> `optional` **screenTrackId?**: `string`

### userId

> **userId**: [`UserGuid`](UserGuid.md)

### videoTrackId?

> `optional` **videoTrackId?**: `string`