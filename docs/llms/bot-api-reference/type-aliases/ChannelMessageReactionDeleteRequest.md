---
path: bot-api-reference/type-aliases/ChannelMessageReactionDeleteRequest.md
audience: bot
category: reference
summary: Request object for removing a reaction from a message.
---

> **ChannelMessageReactionDeleteRequest** = `object`

Request object for removing a reaction from a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message to remove the reaction from. Required.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction to remove, including colons (e.g., `:thumbsup:`). For community emojis, use the three-colon format with the emoji ID: `:shortcode:emojiId:` (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`). Required.