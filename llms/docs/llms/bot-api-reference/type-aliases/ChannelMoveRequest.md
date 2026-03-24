---
path: bot-api-reference/type-aliases/ChannelMoveRequest.md
audience: bot
category: reference
summary: Request object for moving a channel to a different position or channel group.
---

> **ChannelMoveRequest** = `object`

Request object for moving a channel to a different position or channel group.

## Properties

### beforeChannelId?

> `optional` **beforeChannelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of an existing channel in the destination group that the moved channel should be placed after. The moved channel is inserted immediately after `beforeChannelId` in sort order. Optional.

- **Omitted or `null`**: The channel is placed first in the destination group.
- **Last channel in the group**: The channel is placed last (at the end).
- **Any other channel**: The channel is inserted between `beforeChannelId` and the channel that originally followed it.

For example, given channels ordered `A → B → C → D`, moving channel `D` with `beforeChannelId: B` produces `A → B → D → C`. `D` is pulled from its current position and inserted immediately after `B`.

Fails with `NotFoundException` if the specified channel does not exist in the destination group.

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel to move. Required.

### newChannelGroupId

> **newChannelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the channel group to move the channel into. Can be the same as `oldChannelGroupId` to reorder a channel within its current group. Required.

When `newChannelGroupId` equals `oldChannelGroupId`, the operation is a positional reorder only. No audit log entry is written and permissions are not modified. When moving across groups, if the channel inherits permissions from its parent group (`useChannelGroupPermission` is `true`), the channel's permission role maps are replaced with those of the destination group.

### oldChannelGroupId

> **oldChannelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the channel group the channel is currently in. Used for permission checks and audit logging. Required.