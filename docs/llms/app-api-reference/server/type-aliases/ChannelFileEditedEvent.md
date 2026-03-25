---
path: app-api-reference/server/type-aliases/ChannelFileEditedEvent.md
audience: app
category: reference
summary: Event payload emitted when a file is renamed.
---

> **ChannelFileEditedEvent** = `object`

Event payload emitted when a file is renamed.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel containing the file.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory containing the file.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the edited file.

### name

> **name**: `string`

The new display name of the file.