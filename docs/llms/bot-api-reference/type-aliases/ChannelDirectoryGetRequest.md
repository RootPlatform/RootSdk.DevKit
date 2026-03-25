---
path: bot-api-reference/type-aliases/ChannelDirectoryGetRequest.md
audience: bot
category: reference
summary: Request object for retrieving a single directory.
---

> **ChannelDirectoryGetRequest** = `object`

Request object for retrieving a single directory.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory. Required.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the directory to retrieve. Required.