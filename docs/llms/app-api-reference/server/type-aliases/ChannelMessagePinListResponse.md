---
path: app-api-reference/server/type-aliases/ChannelMessagePinListResponse.md
audience: app
category: reference
summary: Response object returned when listing pinned messages in a channel.
---

> **ChannelMessagePinListResponse** = `object`

Response object returned when listing pinned messages in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel the pinned messages belong to.

### messages

> **messages**: [`ChannelMessage`](ChannelMessage.md)[]

Array of `ChannelMessage` objects representing the pinned messages.

### newCount

> **newCount**: `number`

The number of pinned messages newer than the returned set.

### oldCount

> **oldCount**: `number`

The number of pinned messages older than the returned set.

### referenceMaps?

> `optional` **referenceMaps**: [`MessageReferenceMaps`](MessageReferenceMaps.md)

Optional `MessageReferenceMaps` object containing resolved references for users, channels, roles, and assets mentioned across all pinned messages.