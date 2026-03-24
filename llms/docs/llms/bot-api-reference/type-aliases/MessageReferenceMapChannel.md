---
path: bot-api-reference/type-aliases/MessageReferenceMapChannel.md
audience: bot
category: reference
summary: A resolved channel mention containing the channel ID and its current name.
---

> **MessageReferenceMapChannel** = `object`

A resolved channel mention containing the channel ID and its current name.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the mentioned channel.

### name

> **name**: `string`

The current name of the channel. This value is resolved when the message is retrieved, so it reflects the channel's current name, not the name at the time the message was sent.