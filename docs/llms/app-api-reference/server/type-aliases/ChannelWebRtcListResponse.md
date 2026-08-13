---
path: app-api-reference/server/type-aliases/ChannelWebRtcListResponse.md
audience: app
category: reference
summary: Response object returned when listing voice channel participants.
---

> **ChannelWebRtcListResponse** = `object`

Response object returned when listing voice channel participants.

## Properties

### createdAt?

> `optional` **createdAt?**: `Date`

The timestamp when the voice session was created. Optional; may be undefined if no session is active.

### members

> **members**: [`WebRtcUserInfoResponse`](WebRtcUserInfoResponse.md)[]

Array of `WebRtcUserInfoResponse` objects representing the current participants. Empty when no participants are present.