---
path: app-api-reference/server/enumerations/ChannelDirectoryEvent.md
audience: app
category: reference
summary: Enum providing string constants for directory event names. Use these values when subscribing to events on `ChannelDirectoryClient`.
---

Enum providing string constants for directory event names. Use these values when subscribing to events on `ChannelDirectoryClient`.

## Enumeration Members

### ChannelDirectoryCreated

> **ChannelDirectoryCreated**: `"channelDirectory.created"`

Emitted when a directory is created.

### ChannelDirectoryDeleted

> **ChannelDirectoryDeleted**: `"channelDirectory.deleted"`

Emitted when a directory is deleted.

### ChannelDirectoryEdited

> **ChannelDirectoryEdited**: `"channelDirectory.edited"`

Emitted when a directory is renamed.

### ChannelDirectoryMoved

> **ChannelDirectoryMoved**: `"channelDirectory.moved"`

Emitted when a directory is moved to a different parent.