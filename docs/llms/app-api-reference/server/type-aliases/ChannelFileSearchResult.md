---
path: app-api-reference/server/type-aliases/ChannelFileSearchResult.md
audience: app
category: reference
summary: Search result for a single channel in a community-wide file search.
---

> **ChannelFileSearchResult** = `object`

Search result for a single channel in a community-wide file search.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the matching files.

### files

> **files**: [`ChannelFile`](ChannelFile.md)[]

Array of `ChannelFile` objects that matched the search criteria.

### totalCount

> **totalCount**: `number`

The total number of matching files in this channel. May be greater than the number of files returned if results are paginated.