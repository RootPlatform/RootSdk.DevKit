---
path: app-api-reference/server/type-aliases/ChannelDirectoryCreatedEvent.md
audience: app
category: reference
summary: Event payload emitted when a directory is created.
---

> **ChannelDirectoryCreatedEvent** = `object`

Event payload emitted when a directory is created.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the directory.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### id

> **id**: [`DirectoryGuid`](DirectoryGuid.md)

The unique identifier of the created directory.

### name

> **name**: `string`

The display name of the created directory.

### parentDirectoryId

> **parentDirectoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the parent directory.