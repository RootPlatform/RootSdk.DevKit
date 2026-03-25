---
path: app-api-reference/server/type-aliases/ChannelFileSearchRequest.md
audience: app
category: reference
summary: Request object for searching files by name within a single channel.
---

> **ChannelFileSearchRequest** = `object`

Request object for searching files by name within a single channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel to search in. Required.

### lastFileId?

> `optional` **lastFileId**: [`FileGuid`](FileGuid.md)

The ID of the last file from the previous page. Optional. Use for pagination to retrieve the next set of results.

### search

> **search**: `string`

The search string to match against file names. Required. Performs a case-insensitive substring match. Wildcards and regular expressions are not supported.