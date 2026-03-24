---
path: bot-api-reference/type-aliases/ChannelMessageDeleteRequest.md
audience: bot
category: reference
summary: Request object for deleting a message from a channel.
---

> **ChannelMessageDeleteRequest** = `object`

Request object for deleting a message from a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message to delete. Required.