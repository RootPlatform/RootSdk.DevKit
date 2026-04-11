---
path: bot-api-reference/type-aliases/ChannelFileCreatedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a file is created.
---

> **ChannelFileCreatedEvent** = `object`

Event payload emitted when a file is created.

## Properties

### assetId

> **assetId**: [`AssetGuid`](AssetGuid.md)

The unique identifier of the asset containing the file content.

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

The unique identifier of the created file.

### length

> **length**: `bigint`

The file size in bytes.

### mimeType

> **mimeType**: `string`

The MIME type of the file.

### modifiedAt

> **modifiedAt**: `Date`

The timestamp when the file was created.

### name

> **name**: `string`

The display name of the file.

### sha256

> **sha256**: `Uint8Array`

The SHA-256 hash of the file content as a byte array.