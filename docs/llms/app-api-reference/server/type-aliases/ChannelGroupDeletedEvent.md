---
path: app-api-reference/server/type-aliases/ChannelGroupDeletedEvent.md
audience: app
category: reference
summary: Event payload emitted when a channel group is no longer visible to your code.
---

> **ChannelGroupDeletedEvent** = `object`

Event payload emitted when a channel group is no longer visible to your code. This includes deleted channel groups (along with all channels within them) and existing channel groups that your code can no longer see due to permission changes. When a channel group becomes invisible, you also receive `channel.deleted` events for each channel within it. The channel events are emitted before the channel group event.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community where the channel group was deleted.

### id

> **id**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the deleted channel group.