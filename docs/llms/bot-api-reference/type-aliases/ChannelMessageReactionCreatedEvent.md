---
path: bot-api-reference/type-aliases/ChannelMessageReactionCreatedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user adds a reaction to a message.
---

> **ChannelMessageReactionCreatedEvent** = `object`

Event payload emitted when a user adds a reaction to a message. This fires for each individual reaction; if multiple users react with the same emoji, each addition produces a separate event.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the message.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message that received the reaction.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction that was added, including colons (e.g., `:thumbsup:`). For community emojis, the shortcode includes the emoji ID between the second and third colons (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who added the reaction.