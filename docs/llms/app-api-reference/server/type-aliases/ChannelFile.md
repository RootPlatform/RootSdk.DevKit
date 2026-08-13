---
path: app-api-reference/server/type-aliases/ChannelFile.md
audience: app
category: reference
summary: Represents a file stored within a channel directory. Files contain metadata about uploaded content and link to assets in the asset system.
---

> **ChannelFile** = `object`

Represents a file stored within a channel directory. Files contain metadata about uploaded content and link to assets in the asset system.

## Properties

### assetId

> **assetId**: [`AssetGuid`](AssetGuid.md)

The unique identifier of the asset containing the file content. Use this to construct the asset URI for downloading or displaying the file.

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing this file.

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory containing this file.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier for the file.

### length

> **length**: `bigint`

The file size in bytes.

### mimeType

> **mimeType**: `string`

The MIME type of the file (e.g., "image/png", "application/pdf").

### modifiedAt?

> `optional` **modifiedAt?**: `Date`

The timestamp when the file was last modified. Optional.

### name

> **name**: `string`

The display name of the file including extension.

### sha256

> **sha256**: `Uint8Array`

The SHA-256 hash of the file content as a byte array.