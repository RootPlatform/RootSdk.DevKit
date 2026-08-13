---
path: bot-api-reference/type-aliases/ChannelMessageListRequest.md
audience: bot
category: reference
summary: Request object for listing messages in a channel with pagination.
---

> **ChannelMessageListRequest** = `object`

Request object for listing messages in a channel with pagination.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel to list messages from. Required.

### dateAt

> **dateAt**: `Date`

The reference timestamp for pagination. Required. Messages are fetched relative to this date based on the `messageDirectionTake` value.

### limit?

> `optional` **limit?**: `number`

### messageDirectionTake

> **messageDirectionTake**: [`MessageDirectionTake`](../enumerations/MessageDirectionTake.md)

The direction to fetch messages relative to `dateAt`. Required. Use the `MessageDirectionTake` enum values: `Newer` (1) to fetch messages after the timestamp, `Older` (2) to fetch messages before the timestamp, or `Both` (3) to fetch messages in both directions.