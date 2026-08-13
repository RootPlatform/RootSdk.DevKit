---
path: bot-api-reference/type-aliases/ChannelMessageSetViewTimeEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user's last-viewed timestamp is updated for a channel.
---

> **ChannelMessageSetViewTimeEvent** = `object`

Event payload emitted when a user's last-viewed timestamp is updated for a channel. The platform uses this timestamp to determine which messages are unread: any message after `userLastViewedAt` is considered unread for that user.

This event fires when a user views a channel or sends a message in it. The timestamp is set server-side to the current UTC time.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel whose view time was updated.

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community. Optional.

### userLastViewedAt

> **userLastViewedAt**: `Date`

The new last-viewed timestamp for the user in this channel.