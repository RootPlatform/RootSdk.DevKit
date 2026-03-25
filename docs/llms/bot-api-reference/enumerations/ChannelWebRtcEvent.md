---
path: bot-api-reference/enumerations/ChannelWebRtcEvent.md
audience: bot
category: reference
summary: Enum providing string constants for voice channel event names. Use these values when subscribing to events on `ChannelWebRtcClient`.
---

Enum providing string constants for voice channel event names. Use these values when subscribing to events on `ChannelWebRtcClient`.

## Enumeration Members

### ChannelWebRtcUserAttach

> **ChannelWebRtcUserAttach**: `"channelWebRtcUser.attach"`

Emitted when a user joins a voice channel.

### ChannelWebRtcUserDetach

> **ChannelWebRtcUserDetach**: `"channelWebRtcUser.detach"`

Emitted when a user leaves a voice channel, either voluntarily or by being kicked.

### ChannelWebRtcUserDeviceSetDataChannel

> **ChannelWebRtcUserDeviceSetDataChannel**: `"channelWebRtcUserDevice.set.dataChannel"`

Emitted when a user's data channel configuration changes.

### ChannelWebRtcUserDeviceSetStatus

> **ChannelWebRtcUserDeviceSetStatus**: `"channelWebRtcUserDevice.set.status"`

Emitted when a user's mute or deafen state changes.

### ChannelWebRtcUserDeviceSetTransport

> **ChannelWebRtcUserDeviceSetTransport**: `"channelWebRtcUserDevice.set.transport"`

Emitted when a user enables or disables their microphone, camera, or screen sharing.