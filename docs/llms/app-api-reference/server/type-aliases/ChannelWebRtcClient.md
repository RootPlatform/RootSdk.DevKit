---
path: app-api-reference/server/type-aliases/ChannelWebRtcClient.md
audience: app
category: reference
summary: Service client for monitoring and moderating voice channel participants.
---

> **Worked sample**: `api-samples/server-voice/` — Voice (WebRTC)

> **ChannelWebRtcClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`ChannelWebRtcEvents`](ChannelWebRtcEvents.md)> & `object`

Service client for monitoring and moderating voice channel participants. Provides methods to list active participants, kick users from voice, and apply server-side mute or deafen states.

This client does not provide access to audio content. Apps and bots can observe participation events and enforce policies based on observable state, but cannot listen to or broadcast audio.

Access this client via `rootServer.community.channelWebRtcs`.

## Type Declaration

### kick()

> **kick**(`request`: [`ChannelWebRtcKickRequest`](ChannelWebRtcKickRequest.md)): `Promise`<`void`>

Removes a participant from a voice channel. The user can rejoin unless other restrictions apply.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelWebRtcKickRequest`](ChannelWebRtcKickRequest.md) | Identifies the channel and user to kick. |

#### Returns

`Promise`<`void`>

A promise that resolves when the kick completes.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToKick` if missing required permissions, or `NotFound` if the user is not in the voice channel.

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "voiceKick": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `voiceKick` on the channel

### list()

> **list**(`request`: [`ChannelWebRtcListRequest`](ChannelWebRtcListRequest.md)): `Promise`<[`ChannelWebRtcListResponse`](ChannelWebRtcListResponse.md)>

Lists all participants currently in a voice channel. If no voice session is active, returns an empty array rather than throwing an error.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelWebRtcListRequest`](ChannelWebRtcListRequest.md) | Identifies the voice channel to query. |

#### Returns

`Promise`<[`ChannelWebRtcListResponse`](ChannelWebRtcListResponse.md)>

A promise that resolves to a `ChannelWebRtcListResponse` containing the session creation time and array of participants. When no voice session is active, `members` is an empty array.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.

### setMuteAndDeafenOther()

> **setMuteAndDeafenOther**(`request`: [`ChannelWebRtcSetMuteAndDeafenOtherRequest`](ChannelWebRtcSetMuteAndDeafenOtherRequest.md)): `Promise`<`void`>

Applies server-side mute or deafen state to a participant. Server mutes cannot be overridden by the user until removed by an app or moderator.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelWebRtcSetMuteAndDeafenOtherRequest`](ChannelWebRtcSetMuteAndDeafenOtherRequest.md) | Identifies the channel, user, and desired mute/deafen state. |

#### Returns

`Promise`<`void`>

A promise that resolves when the state change completes.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToMute` if missing required permissions, or `NotFound` if the user is not in the voice channel.

#### Authorization

Depending on your usage, you may also need to declare:

- `voiceMuteOther` if setting isMuted
- `voiceDeafenOther` if setting isDeafened