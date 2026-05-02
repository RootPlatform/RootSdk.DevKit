---
kind: sample-bot
description: Channel property management
complexity: minimal
key_patterns:
  - channel updates
  - voice channel events
permissions:
  - channel.fullControl
---

# reset-channel-description

A voice-channel housekeeper. When the last participant leaves a voice channel, the bot clears that channel's description so it starts fresh for the next session. Reach for this sample when you need to mutate channel metadata in response to a voice/WebRTC event.

## What it demonstrates

- Subscribing to `ChannelWebRtcEvent.ChannelWebRtcUserDetach` on `rootServer.community.channelWebRtcs` to react when someone leaves a voice channel.
- Confirming the channel is now empty by calling `rootServer.community.channelWebRtcs.list` and checking the returned `members` array.
- Fetching the current channel state with `rootServer.community.channels.get`, then editing it via `rootServer.community.channels.edit` — `edit` requires the full channel definition, so the existing `name` and `useChannelGroupPermission` are passed through unchanged while only `description` is replaced.

## Permissions

```json
{
  "channel": {
    "fullControl": true
  }
}
```

