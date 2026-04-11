---
path: bot-api-reference/type-aliases/ChannelDirectoryEditedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a directory is renamed.
---

> **ChannelDirectoryEditedEvent** = `object`

Event payload emitted when a directory is renamed.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the edited directory.

### name

> **name**: `string`

The new display name of the directory.

### parentDirectoryId

> **parentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the parent directory.