---
kind: sample-bot
description: Show a live participant count on a voice channel
complexity: moderate
key_patterns:
  - voice channel events
  - channel updates
  - idempotent description rewriting
permissions:
  - channel.fullControl
---

# voice-count

Keeps a live participant count in a voice channel's description, so members can see how many people are in a call without joining it. Reach for this sample when you need to react to voice activity, or when you are writing derived state into a field a human also edits.

## What it demonstrates

- Subscribing to both sides of voice activity: `ChannelWebRtcEvent.ChannelWebRtcUserAttach` and `ChannelWebRtcUserDetach`, both routed into one `refreshChannel` call so the two paths cannot drift apart.
- Reading the current participants with `rootServer.community.channelWebRtcs.list` rather than counting events. An event tells you something changed; it does not tell you the total, and a missed event would leave a counter permanently wrong.
- Writing the count into the channel description with `channelEdit`, while preserving whatever description a human wrote. The `COUNT_SUFFIX` pattern strips any existing ` [n]` before appending the new one, so repeated updates do not compound.
- Debouncing the clear. When the last participant leaves, a channel with a human-written description waits `IDLE_CLEAR_DELAY_MS` (two minutes) before the count is removed, so a brief drop to zero does not rewrite the description twice in a few seconds. Channels with no base description clear immediately.
- Catching errors per handler, so a failure updating one channel cannot stop the bot reacting to the next event.

## Compare with reset-channel-description

[`reset-channel-description`](../reset-channel-description/AGENTS.md) handles the leave event only and clears the description when a channel empties. This bot handles both events and maintains a value. Between them they cover the WebRTC participant events from both directions, and the difference in shape is the point: one reacts to a transition, the other maintains derived state.

## Permissions

```json
{
  "channel": {
    "fullControl": true
  }
}
```
