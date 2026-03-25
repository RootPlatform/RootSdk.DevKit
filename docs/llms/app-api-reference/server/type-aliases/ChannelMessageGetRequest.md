---
path: app-api-reference/server/type-aliases/ChannelMessageGetRequest.md
audience: app
category: reference
summary: Request object for retrieving a single message by ID.
---

> **ChannelMessageGetRequest** = `object`

Request object for retrieving a single message by ID.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message to retrieve. Required.