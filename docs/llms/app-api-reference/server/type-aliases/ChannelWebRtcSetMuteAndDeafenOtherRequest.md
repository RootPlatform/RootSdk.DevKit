---
path: app-api-reference/server/type-aliases/ChannelWebRtcSetMuteAndDeafenOtherRequest.md
audience: app
category: reference
summary: Request object for applying server-side mute or deafen state to a voice channel participant.
---

> **ChannelWebRtcSetMuteAndDeafenOtherRequest** = `object`

Request object for applying server-side mute or deafen state to a voice channel participant.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the voice channel. Required.

### isDeafened?

> `optional` **isDeafened**: `boolean`

Whether to server-deafen the user. Optional. Set to `true` to deafen, `false` to undeafen, or omit to leave unchanged.

### isMuted?

> `optional` **isMuted**: `boolean`

Whether to server-mute the user. Optional. Set to `true` to mute, `false` to unmute, or omit to leave unchanged.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user to mute or deafen. Required.