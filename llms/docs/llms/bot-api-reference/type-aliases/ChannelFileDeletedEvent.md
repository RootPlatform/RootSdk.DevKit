---
path: bot-api-reference/type-aliases/ChannelFileDeletedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a file is deleted.
---

> **ChannelFileDeletedEvent** = `object`

Event payload emitted when a file is deleted.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel that contained the file.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory that contained the file.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the deleted file.