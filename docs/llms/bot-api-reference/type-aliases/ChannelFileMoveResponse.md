---
path: bot-api-reference/type-aliases/ChannelFileMoveResponse.md
audience: bot
category: reference
summary: Response object returned after moving a file.
---

> **ChannelFileMoveResponse** = `object`

Response object returned after moving a file.

## Properties

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the new directory containing the file.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the moved file.

### oldDirectoryId?

> `optional` **oldDirectoryId?**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the previous directory. Optional.