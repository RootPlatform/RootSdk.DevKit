---
path: bot-api-reference/type-aliases/ChannelDirectoryMovedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a directory is moved to a different parent.
---

> **ChannelDirectoryMovedEvent** = `object`

Event payload emitted when a directory is moved to a different parent.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the moved directory.

### oldParentDirectoryId

> **oldParentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the previous parent directory.

### parentDirectoryId

> **parentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the new parent directory.