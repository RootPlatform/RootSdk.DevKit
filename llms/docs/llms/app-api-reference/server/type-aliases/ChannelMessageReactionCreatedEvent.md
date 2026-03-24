---
path: app-api-reference/server/type-aliases/ChannelMessageReactionCreatedEvent.md
audience: app
category: reference
summary: Event data emitted when a reaction is added to a message.
---

> **ChannelMessageReactionCreatedEvent** = `object`

Event data emitted when a reaction is added to a message.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The ID of the message that received the reaction.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction that was added, including colons (e.g., `:thumbsup:`). For community emojis, the shortcode includes the emoji ID between the second and third colons (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user who added the reaction.