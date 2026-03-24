---
path: bot-api-reference/type-aliases/MessageReaction.md
audience: bot
category: reference
summary: Represents a reaction on a message, used within `ChannelMessage` objects.
---

> **MessageReaction** = `object`

Represents a reaction on a message, used within `ChannelMessage` objects.

## Properties

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction including colons (e.g., `:thumbsup:`, `:heart:`). For community emojis, the shortcode includes the emoji ID between the second and third colons (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user who added the reaction.