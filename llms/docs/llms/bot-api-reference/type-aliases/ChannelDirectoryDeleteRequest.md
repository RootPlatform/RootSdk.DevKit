---
path: bot-api-reference/type-aliases/ChannelDirectoryDeleteRequest.md
audience: bot
category: reference
summary: Request object for deleting a directory and all its contents.
---

> **ChannelDirectoryDeleteRequest** = `object`

Request object for deleting a directory and all its contents.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory. Required.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the directory to delete. Required.