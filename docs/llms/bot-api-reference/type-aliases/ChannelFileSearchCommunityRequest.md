---
path: bot-api-reference/type-aliases/ChannelFileSearchCommunityRequest.md
audience: bot
category: reference
summary: Request object for searching files by name across multiple channels.
---

> **ChannelFileSearchCommunityRequest** = `object`

Request object for searching files by name across multiple channels.

## Properties

### channelIds

> **channelIds**: [`ChannelGuid`](ChannelGuid.md)[]

Array of channel IDs to search in. Required.

### search

> **search**: `string`

The search string to match against file names. Required. Performs a case-insensitive substring match. Wildcards and regular expressions are not supported.