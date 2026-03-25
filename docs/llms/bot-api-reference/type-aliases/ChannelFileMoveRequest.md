---
path: bot-api-reference/type-aliases/ChannelFileMoveRequest.md
audience: bot
category: reference
summary: Request object for moving a file to a different directory.
---

> **ChannelFileMoveRequest** = `object`

Request object for moving a file to a different directory.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the file. Required.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the file to move. Required.

### newDirectoryId

> **newDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the target directory. Required.

### oldDirectoryId

> **oldDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the file's current directory. Required.