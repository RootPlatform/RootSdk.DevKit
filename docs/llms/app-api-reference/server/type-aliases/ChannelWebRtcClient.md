---
path: app-api-reference/server/type-aliases/ChannelWebRtcClient.md
audience: app
category: reference
summary: Service client for monitoring and moderating voice channel participants.
---

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

#### Example

```ts
import {
  ChannelWebRtcKickRequest,
  ChannelGuid,
  UserGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function kickExample(
  channelId: ChannelGuid,
  userId?: UserGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelWebRtcKickRequest = {
      channelId: channelId,
      userId: userId,
    };

    // Call the API
    await rootServer.community.channelWebRtcs.kick(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  ChannelWebRtcListRequest,
  ChannelWebRtcListResponse,
  ChannelGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function listExample(
  channelId: ChannelGuid,
): Promise<ChannelWebRtcListResponse> {
  try {
    // Set up the request
    const request: ChannelWebRtcListRequest = {
      channelId: channelId,
    };

    // Call the API
    const response: ChannelWebRtcListResponse =
      await rootServer.community.channelWebRtcs.list(request);

    return response;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  ChannelWebRtcSetMuteAndDeafenOtherRequest,
  ChannelGuid,
  UserGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function setMuteAndDeafenOtherExample(
  channelId: ChannelGuid,
  userId: UserGuid,
  isMuted?: boolean,
  isDeafened?: boolean,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelWebRtcSetMuteAndDeafenOtherRequest = {
      channelId: channelId,
      userId: userId,
      isMuted: isMuted,
      isDeafened: isDeafened,
    };

    // Call the API
    await rootServer.community.channelWebRtcs.setMuteAndDeafenOther(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Depending on your usage, you may also need to declare:

- `voiceMuteOther` if setting isMuted
- `voiceDeafenOther` if setting isDeafened