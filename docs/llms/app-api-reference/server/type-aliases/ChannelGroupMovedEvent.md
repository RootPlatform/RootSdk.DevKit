---
path: app-api-reference/server/type-aliases/ChannelGroupMovedEvent.md
audience: app
category: reference
summary: Event payload emitted when a visible channel group is moved to a different position in the sidebar.
---

> **ChannelGroupMovedEvent** = `object`

Event payload emitted when a visible channel group is moved to a different position in the sidebar.

## Properties

### beforeChannelGroupId?

> `optional` **beforeChannelGroupId?**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

Indicates the new position. If set, this channel group now appears directly above the specified channel group. If undefined, this channel group is now at the bottom of the sidebar.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community containing the channel group.

### id

> **id**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the moved channel group.