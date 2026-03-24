---
path: bot-api-reference/type-aliases/ChannelGroupMoveRequest.md
audience: bot
category: reference
summary: Request to move a channel group to a different position in the sidebar.
---

> **ChannelGroupMoveRequest** = `object`

Request to move a channel group to a different position in the sidebar.

## Properties

### beforeChannelGroupId?

> `optional` **beforeChannelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The channel group to position this one above. If set, this channel group will appear directly above the specified channel group. Omit to move to the top of the sidebar.

### id

> **id**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the channel group to move. Required.