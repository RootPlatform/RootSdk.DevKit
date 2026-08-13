---
path: bot-api-reference/type-aliases/ChannelDirectoryCreateRequest.md
audience: bot
category: reference
summary: Request object for creating a new directory in a channel.
---

> **ChannelDirectoryCreateRequest** = `object`

Request object for creating a new directory in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel to create the directory in. Required.

### name

> **name**: `string`

The display name for the new directory. Required.

### parentDirectoryId?

> `optional` **parentDirectoryId?**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the parent directory. Optional. When omitted, the directory is created at the channel's root level.