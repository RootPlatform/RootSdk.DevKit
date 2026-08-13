---
path: bot-api-reference/type-aliases/ChannelMessageSetTypingIndicatorEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user starts or stops typing in a channel.
---

> **ChannelMessageSetTypingIndicatorEvent** = `object`

Event payload emitted when a user starts or stops typing in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel.

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### createdAt?

> `optional` **createdAt?**: `Date`

When the typing indicator was set. Optional.

### isTyping

> **isTyping**: `boolean`

Whether the user is currently typing. `true` when the user starts typing, `false` when they stop.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user whose typing state changed.