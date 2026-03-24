---
path: app-api-reference/server/type-aliases/ChannelDirectoryMoveResponse.md
audience: app
category: reference
summary: Response object returned after moving a directory.
---

> **ChannelDirectoryMoveResponse** = `object`

Response object returned after moving a directory.

## Properties

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the moved directory.

### oldParentDirectoryId

> **oldParentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the previous parent directory.

### parentDirectoryId

> **parentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the new parent directory.