# How-To: Voice (WebRTC)

Observe and moderate voice channel participants. Bots/apps cannot join voice calls — these are moderation tools: list who's in the call, server-mute/deafen users, and kick them.

## Source Files

| File | What it covers |
|------|---------------|
| [voice.ts](src/voice.ts) | All 3 voice methods + 5 events |

## SDK Methods

- `channelWebRtcs.list(request)` — list current voice session participants
- `channelWebRtcs.setMuteAndDeafenOther(request)` — server-mute and/or server-deafen a participant
- `channelWebRtcs.kick(request)` — kick a participant (or all participants) from the voice channel

## Permissions

```json
{
  "channel": {
    "voiceMuteOther": true,
    "voiceDeafenOther": true,
    "voiceKick": true,
    "createMessage": true
  }
}
```

- _(no permission needed for list)_
- `channel.voiceMuteOther` — required for setMuteAndDeafenOther (if setting isMuted)
- `channel.voiceDeafenOther` — required for setMuteAndDeafenOther (if setting isDeafened)
- `channel.voiceKick` — required for kick
- `channel.createMessage` — only for the `/voice` command trigger

## Events

- `ChannelWebRtcEvent.ChannelWebRtcUserAttach` — user joined the voice channel
- `ChannelWebRtcEvent.ChannelWebRtcUserDetach` — user left or was kicked (check `isKick`)
- `ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetStatus` — mute/deafen flags changed
- `ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetTransport` — media tracks changed (audio/video/screen)
- `ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetDataChannel` — data channel established

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Moderation-only API** — bots/apps cannot join voice calls. They can only observe (list), moderate (mute/deafen/kick), and react to events.
- **4-flag mute/deafen model** — each participant has `isMuted` (self), `isAdminMuted` (server), `isDeafened` (self), `isAdminDeafened` (server). `setMuteAndDeafenOther` sets the admin flags. The user's own flags are independent.
- **setMuteAndDeafenOther fields are optional** — omit `isMuted` or `isDeafened` to leave that flag unchanged.
- **kick userId is optional** — omit `userId` to kick ALL participants from the voice channel.
- **Device-level tracking** — each participant has a `deviceId`. A user could be connected from multiple devices.
- **list() returns session info** — `createdAt` is when the voice session started; `members` is the participant list. Both are optional (undefined if no active session).
- **isKick on detach** — `ChannelWebRtcUserDetachEvent.isKick` distinguishes voluntary leave from admin kick.
- **isAudio/isVideo/isScreen** — `WebRtcUserInfoResponse` includes booleans showing which media types are active per participant.
- **Media track IDs** — transport events report `audioTrackId`, `videoTrackId`, `screenTrackId`, `screenAudioTrackId` for WebRTC transport-level awareness.
