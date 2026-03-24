---
path: bot-docs/develop/community-api/voice-channels.md
audience: bot
category: guide
summary: Monitor and moderate voice channel participants.
---

# Voice channels

Monitor and moderate voice channel participants.

## What are voice channels?

A voice channel is a channel where members can join real-time audio sessions. Unlike text channels where content persists, voice channels host transient sessions where participants connect, talk, and leave.

### Participant states

Each participant in a voice channel has several state properties:

| Property | Description |
|----------|-------------|
| `isMuted` | User has muted themselves |
| `isDeafened` | User has deafened themselves (can't hear others) |
| `isAdminMuted` | Server has muted the user |
| `isAdminDeafened` | Server has deafened the user |

Admin states override user states. If `isAdminMuted` is true, the user cannot unmute themselves until an app or moderator removes the admin mute.

### What you can do

The `ChannelWebRtcClient` provides three operations:

| Method | Description |
|--------|-------------|
| `list` | Get all participants currently in a voice channel |
| `kick` | Remove a participant from the voice channel |
| `setMuteAndDeafenOther` | Server-mute or server-deafen a participant |

```ts
// List participants in a voice channel
const session = await rootServer.community.channelWebRtcs.list({
  channelId: voiceChannelId
});

for (const member of session.members) {
  console.log(`${member.userId}: muted=${member.isMuted}, deafened=${member.isDeafened}`);
}
```

## How voice channel events work

Apps and bots receive real-time events when voice channel activity occurs. Use these events to track participation and respond to state changes.

### Event types

| Event | Trigger |
|-------|---------|
| `ChannelWebRtcUserAttach` | A user joins the voice channel |
| `ChannelWebRtcUserDetach` | A user leaves (or is kicked from) the voice channel |
| `ChannelWebRtcUserDeviceSetStatus` | A user's mute or deafen state changes |

```ts
import { rootServer, ChannelWebRtcEvent } from "@rootsdk/server-bot";

// Track when users join
rootServer.community.channelWebRtcs.on(
  ChannelWebRtcEvent.ChannelWebRtcUserAttach,
  (event) => {
    console.log(`User ${event.userId} joined voice channel ${event.channelId}`);
  }
);

// Track when users leave
rootServer.community.channelWebRtcs.on(
  ChannelWebRtcEvent.ChannelWebRtcUserDetach,
  (event) => {
    const action = event.isKick ? 'was kicked from' : 'left';
    console.log(`User ${event.userId} ${action} voice channel ${event.channelId}`);
  }
);

// Track mute/deafen changes
rootServer.community.channelWebRtcs.on(
  ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetStatus,
  (event) => {
    console.log(`User ${event.userId} status: muted=${event.isMuted}, deafened=${event.isDeafened}`);
  }
);
```

### Moderating participants

Use `setMuteAndDeafenOther` to server-mute or server-deafen a user. Server mutes cannot be overridden by the user.

```ts
// Server-mute a disruptive user
await rootServer.community.channelWebRtcs.setMuteAndDeafenOther({
  channelId: voiceChannelId,
  userId: targetUserId,
  isMuted: true
});

// Remove the server mute
await rootServer.community.channelWebRtcs.setMuteAndDeafenOther({
  channelId: voiceChannelId,
  userId: targetUserId,
  isMuted: false
});
```

Use `kick` to remove a user from the voice channel entirely.

```ts
// Kick a user from voice
await rootServer.community.channelWebRtcs.kick({
  channelId: voiceChannelId,
  userId: targetUserId
});
```

## When to use voice channel APIs

Apps and bots cannot access audio content. Use these APIs to respond to participation events and enforce policies based on observable state.

- **Presence dashboards**: Display which users are currently in voice channels
- **Cross-channel moderation**: When your text spam detection flags a user, also mute them in voice
- **AFK management**: Kick users who have been deafened for extended periods