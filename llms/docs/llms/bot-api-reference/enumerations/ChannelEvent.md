---
path: bot-api-reference/enumerations/ChannelEvent.md
audience: bot
category: reference
summary: Enum providing string constants for channel event names. Use these values when subscribing to events on `ChannelClient`.
---

Enum providing string constants for channel event names. Use these values when subscribing to events on `ChannelClient`.

## Enumeration Members

### ChannelCreated

> **ChannelCreated**: `"channel.created"`

Emitted when a channel becomes visible to your code. This includes newly created channels and existing channels that your code can now see due to permission changes.

### ChannelDeleted

> **ChannelDeleted**: `"channel.deleted"`

Emitted when a channel is no longer visible to your code. This includes deleted channels and existing channels that your code can no longer see due to permission changes.

### ChannelEdited

> **ChannelEdited**: `"channel.edited"`

Emitted when a visible channel's properties or permissions change.

### ChannelMoved

> **ChannelMoved**: `"channel.moved"`

Emitted when a visible channel is moved to a different position or channel group.