---
path: bot-api-reference/type-aliases/ChannelMessageSetTypingIndicatorEvent.md
audience: bot
category: reference
summary: Event data emitted when a user's typing indicator status changes in a channel.
---

> **ChannelMessageSetTypingIndicatorEvent** = `object`

Event data emitted when a user's typing indicator status changes in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel where the typing indicator changed.

### communityId?

> `optional` **communityId**: [`CommunityGuid`](CommunityGuid.md)

### createdAt?

> `optional` **createdAt**: `Date`

Optional timestamp when the typing indicator was set.

### isTyping

> **isTyping**: `boolean`

Boolean indicating whether the user is currently typing.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user whose typing status changed.