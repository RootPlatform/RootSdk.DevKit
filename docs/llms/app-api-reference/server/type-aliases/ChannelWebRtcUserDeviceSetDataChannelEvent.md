---
path: app-api-reference/server/type-aliases/ChannelWebRtcUserDeviceSetDataChannelEvent.md
audience: app
category: reference
summary: Event payload emitted when a user's data channel configuration changes in a voice channel.
---

> **ChannelWebRtcUserDeviceSetDataChannelEvent** = `object`

Event payload emitted when a user's data channel configuration changes in a voice channel. Data channels are internal peer-to-peer messaging infrastructure used by the Root client for real-time state like speaking indicators. Your code can observe when data channels are established but cannot participate in the communication.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the voice channel.

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### dataChannelName

> **dataChannelName**: `string`

The name of the data channel.

### deviceId

> **deviceId**: [`DeviceGuid`](DeviceGuid.md)

The unique identifier of the user's device.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user whose data channel changed.