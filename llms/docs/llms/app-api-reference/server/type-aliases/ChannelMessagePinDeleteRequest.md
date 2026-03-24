---
path: app-api-reference/server/type-aliases/ChannelMessagePinDeleteRequest.md
audience: app
category: reference
summary: Request object for removing a pin from a message.
---

> **ChannelMessagePinDeleteRequest** = `object`

Request object for removing a pin from a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the pinned message to unpin. Required.