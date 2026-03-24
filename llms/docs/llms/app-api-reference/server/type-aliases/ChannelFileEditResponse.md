---
path: app-api-reference/server/type-aliases/ChannelFileEditResponse.md
audience: app
category: reference
summary: Response object returned after renaming a file.
---

> **ChannelFileEditResponse** = `object`

Response object returned after renaming a file.

## Properties

### directoryId

> **directoryId**: [`DirectoryGuid`](DirectoryGuid.md)

The ID of the directory containing the file.

### id

> **id**: [`FileGuid`](FileGuid.md)

The unique identifier of the edited file.

### name

> **name**: `string`

The new display name of the file.