---
path: bot-api-reference/type-aliases/ChannelFileDeleteRequest.md
audience: bot
category: reference
summary: Request object for deleting a file.
---

> **ChannelFileDeleteRequest** = `object`

Request object for deleting a file.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the file. Required.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory containing the file. Required.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the file to delete. Required.