---
path: app-api-reference/server/type-aliases/ChannelMessageReactionDeletedEvent.md
audience: app
category: reference
summary: Event payload emitted when a user removes their reaction from a message.
---

> **ChannelMessageReactionDeletedEvent** = `object`

Event payload emitted when a user removes their reaction from a message. This is a single-user removal; to remove all reactions of a given shortcode regardless of user, see `ChannelMessageReactionDeletedFullEvent`.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the message.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message the reaction was removed from.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction that was removed, including colons (e.g., `:thumbsup:`). For community emojis, the shortcode includes the emoji ID between the second and third colons (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user whose reaction was removed.