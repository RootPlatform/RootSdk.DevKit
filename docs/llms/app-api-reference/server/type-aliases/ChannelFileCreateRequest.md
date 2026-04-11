---
path: app-api-reference/server/type-aliases/ChannelFileCreateRequest.md
audience: app
category: reference
summary: Request object for creating a new file entry in a directory.
---

> **ChannelFileCreateRequest** = `object`

Request object for creating a new file entry in a directory.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel to create the file in. Required.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory to place the file in. Required.

### uploadTokenUri

> **uploadTokenUri**: `string`

The upload token URI obtained from the asset upload system. Required. The file name and metadata are extracted from the uploaded content.