---
path: bot-api-reference/type-aliases/ChannelDirectoryMoveRequest.md
audience: bot
category: reference
summary: Request object for moving a directory to a different parent directory.
---

> **ChannelDirectoryMoveRequest** = `object`

Request object for moving a directory to a different parent directory.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory. Required.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the directory to move. Required.

### newParentDirectoryId

> **newParentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the target parent directory. Required.

### oldParentDirectoryId

> **oldParentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory's current parent. Required.