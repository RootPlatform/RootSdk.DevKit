---
path: bot-api-reference/type-aliases/ChannelFileEditRequest.md
audience: bot
category: reference
summary: Request object for renaming a file.
---

> **ChannelFileEditRequest** = `object`

Request object for renaming a file.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the file. Required.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory containing the file. Required.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the file to edit. Required.

### name

> **name**: `string`

The new display name for the file. Required.