---
path: bot-api-reference/type-aliases/ChannelWebRtcKickRequest.md
audience: bot
category: reference
summary: Request object for removing a participant from a voice channel.
---

> **ChannelWebRtcKickRequest** = `object`

Request object for removing a participant from a voice channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the voice channel. Required.

### userId?

> `optional` **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user to kick. Although the type allows this to be omitted, the request has no effect without it.