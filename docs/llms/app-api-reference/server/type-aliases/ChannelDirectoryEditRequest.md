---
path: app-api-reference/server/type-aliases/ChannelDirectoryEditRequest.md
audience: app
category: reference
summary: Request object for renaming a directory.
---

> **ChannelDirectoryEditRequest** = `object`

Request object for renaming a directory.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory. Required.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the directory to edit. Required.

### name

> **name**: `string`

The new display name for the directory. Required.