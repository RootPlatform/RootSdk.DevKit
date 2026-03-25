---
path: app-api-reference/server/type-aliases/ChannelMessageReaction.md
audience: app
category: reference
summary: Represents a reaction added to a message.
---

> **ChannelMessageReaction** = `object`

Represents a reaction added to a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The ID of the message that has the reaction.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction including colons (e.g., `:thumbsup:`, `:heart:`). For community emojis, the shortcode includes the emoji ID between the second and third colons (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user who added the reaction.