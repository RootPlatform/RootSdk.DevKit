---
path: app-api-reference/server/type-aliases/ChannelMessageSetTypingIndicatorRequest.md
audience: app
category: reference
summary: Request object for updating the typing indicator status in a channel.
---

> **ChannelMessageSetTypingIndicatorRequest** = `object`

Request object for updating the typing indicator status in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel where the typing indicator should be updated. Required.

### isTyping

> **isTyping**: `boolean`

Boolean indicating whether the user is currently typing. Required. Set to `true` when the user starts typing and `false` when they stop or send a message.