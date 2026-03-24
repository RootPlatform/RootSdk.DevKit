---
path: bot-api-reference/type-aliases/ChannelMessageReactionDeletedEvent.md
audience: bot
category: reference
summary: Event data emitted when a reaction is removed from a message.
---

> **ChannelMessageReactionDeletedEvent** = `object`

Event data emitted when a reaction is removed from a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The ID of the message that had the reaction removed.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction that was removed, including colons (e.g., `:thumbsup:`). For community emojis, the shortcode includes the emoji ID between the second and third colons (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user whose reaction was removed.