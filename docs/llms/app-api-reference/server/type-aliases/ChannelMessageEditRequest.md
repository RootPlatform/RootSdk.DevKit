---
path: app-api-reference/server/type-aliases/ChannelMessageEditRequest.md
audience: app
category: reference
summary: Request object for editing an existing message.
---

> **ChannelMessageEditRequest** = `object`

Request object for editing an existing message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### content

> **content**: `string`

The new text content for the message. Required.

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message to edit. Required.

### uris?

> `optional` **uris**: `string`[]

Optional array of URIs for attachments. When provided, replaces the existing attachments on the message.