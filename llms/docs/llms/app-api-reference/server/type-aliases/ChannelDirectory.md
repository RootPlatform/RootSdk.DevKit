---
path: app-api-reference/server/type-aliases/ChannelDirectory.md
audience: app
category: reference
summary: Represents a directory (folder) within a channel's file system.
---

> **ChannelDirectory** = `object`

Represents a directory (folder) within a channel's file system. Directories organize files hierarchically and can be nested to create folder structures.

## Properties

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier for the directory.

### name

> **name**: `string`

The display name of the directory.

### parentDirectoryId?

> `optional` **parentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the parent directory. When undefined, the directory is at the channel's root level.