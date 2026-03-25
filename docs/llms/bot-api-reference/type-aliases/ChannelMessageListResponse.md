---
path: bot-api-reference/type-aliases/ChannelMessageListResponse.md
audience: bot
category: reference
summary: Response object returned when listing messages in a channel.
---

> **ChannelMessageListResponse** = `object`

Response object returned when listing messages in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel the messages belong to.

### messages

> **messages**: [`ChannelMessage`](ChannelMessage.md)[]

Array of `ChannelMessage` objects representing the messages in the requested range.

### newCount

> **newCount**: `number`

The number of messages newer than the returned set. Use this for pagination to determine if more newer messages are available.

### oldCount

> **oldCount**: `number`

The number of messages older than the returned set. Use this for pagination to determine if more older messages are available.

### referenceMaps?

> `optional` **referenceMaps**: [`MessageReferenceMaps`](MessageReferenceMaps.md)

Optional `MessageReferenceMaps` object containing resolved references for users, channels, roles, and assets mentioned across all messages in the response.