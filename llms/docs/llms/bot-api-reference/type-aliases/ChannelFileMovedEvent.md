---
path: bot-api-reference/type-aliases/ChannelFileMovedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a file is moved to a different directory.
---

> **ChannelFileMovedEvent** = `object`

Event payload emitted when a file is moved to a different directory.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the file.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the new directory containing the file.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the moved file.

### oldDirectoryId?

> `optional` **oldDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the previous directory. Optional.