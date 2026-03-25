---
path: app-api-reference/server/type-aliases/ChannelFileGetRequest.md
audience: app
category: reference
summary: Request object for retrieving a single file.
---

> **ChannelFileGetRequest** = `object`

Request object for retrieving a single file.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the file. Required.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory containing the file. Required.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the file to retrieve. Required.