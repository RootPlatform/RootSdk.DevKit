---
path: app-api-reference/server/type-aliases/ChannelFileSearchCommunityResponse.md
audience: app
category: reference
summary: Response object returned from a community-wide file search.
---

> **ChannelFileSearchCommunityResponse** = `object`

Response object returned from a community-wide file search.

## Properties

### results

> **results**: [`ChannelFileSearchResult`](ChannelFileSearchResult.md)[]

Array of `ChannelFileSearchResult` objects, one per channel that contained matching files. Optional; may be undefined if no matches found.