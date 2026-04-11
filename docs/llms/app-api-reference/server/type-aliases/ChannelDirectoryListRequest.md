---
path: app-api-reference/server/type-aliases/ChannelDirectoryListRequest.md
audience: app
category: reference
summary: Request object for listing all directories in a channel. Returns a flat array containing all directories regardless of nesting depth.
---

> **ChannelDirectoryListRequest** = `object`

Request object for listing all directories in a channel. Returns a flat array containing all directories regardless of nesting depth.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel to list directories from. Required.