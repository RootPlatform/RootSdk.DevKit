---
path: app-api-reference/server/type-aliases/ChannelMessageReactionDeletedFullEvent.md
audience: app
category: reference
summary: Event payload emitted when all reactions of a given shortcode are removed from a message, regardless of which users added them.
---

> **ChannelMessageReactionDeletedFullEvent** = `object`

Event payload emitted when all reactions of a given shortcode are removed from a message, regardless of which users added them. This is a bulk operation — contrast with `ChannelMessageReactionDeletedEvent`, which fires when a single user removes their own reaction.

This event only applies to community channels, not direct messages.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the message.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### messageId

> **messageId**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message the reactions were removed from.

### shortcode

> **shortcode**: `string`

The emoji shortcode of the reaction that was removed, including colons (e.g., `:thumbsup:`). For community emojis, the shortcode includes the emoji ID between the second and third colons (e.g., `:team-logo:550e8400-e29b-41d4-a716-446655440000:`).