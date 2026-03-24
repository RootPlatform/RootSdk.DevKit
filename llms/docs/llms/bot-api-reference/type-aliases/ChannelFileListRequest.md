---
path: bot-api-reference/type-aliases/ChannelFileListRequest.md
audience: bot
category: reference
summary: Request object for listing all files in a directory.
---

> **ChannelFileListRequest** = `object`

Request object for listing all files in a directory.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory. Required.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory to list files from. Required.