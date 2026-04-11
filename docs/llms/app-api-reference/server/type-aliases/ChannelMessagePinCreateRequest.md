---
path: app-api-reference/server/type-aliases/ChannelMessagePinCreateRequest.md
audience: app
category: reference
summary: Request object for pinning a message to a channel.
---

> **ChannelMessagePinCreateRequest** = `object`

Request object for pinning a message to a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message to pin. Required.