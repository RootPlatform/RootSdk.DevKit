---
path: bot-api-reference/type-aliases/ChannelDirectoryDeletedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a directory is deleted.
---

> **ChannelDirectoryDeletedEvent** = `object`

Event payload emitted when a directory is deleted.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel that contained the directory.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the deleted directory.