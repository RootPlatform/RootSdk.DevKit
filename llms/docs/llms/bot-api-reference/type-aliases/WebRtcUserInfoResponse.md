---
path: bot-api-reference/type-aliases/WebRtcUserInfoResponse.md
audience: bot
category: reference
summary: Information about a participant in a voice channel session.
---

> **WebRtcUserInfoResponse** = `object`

Information about a participant in a voice channel session.

## Properties

### deviceId

> **deviceId**: [`DeviceGuid`](DeviceGuid.md)

The unique identifier of the user's device connected to voice.

### isAdminDeafened

> **isAdminDeafened**: `boolean`

Whether the user has been server-deafened by an app or moderator. When true, the user cannot undeafen themselves.

### isAdminMuted

> **isAdminMuted**: `boolean`

Whether the user has been server-muted by an app or moderator. When true, the user cannot unmute themselves.

### isAudio

> **isAudio**: `boolean`

Whether the user has an active audio track (microphone enabled).

### isDeafened

> **isDeafened**: `boolean`

Whether the user has deafened themselves.

### isMuted

> **isMuted**: `boolean`

Whether the user has muted themselves.

### isScreen

> **isScreen**: `boolean`

Whether the user is sharing their screen.

### isVideo

> **isVideo**: `boolean`

Whether the user has their camera enabled.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user.