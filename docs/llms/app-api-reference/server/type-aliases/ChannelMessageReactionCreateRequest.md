---
path: app-api-reference/server/type-aliases/ChannelMessageReactionCreateRequest.md
audience: app
category: reference
summary: Request object for adding a reaction to a message.
---

> **ChannelMessageReactionCreateRequest** = `object`

Request object for adding a reaction to a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message to react to. Required.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction including colons (e.g., `:thumbsup:`, `:heart:`). For community emojis, use the three-colon format with the emoji ID: `:shortcode:emojiId:` (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).