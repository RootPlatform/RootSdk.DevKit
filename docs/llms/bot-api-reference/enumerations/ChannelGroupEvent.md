---
path: bot-api-reference/enumerations/ChannelGroupEvent.md
audience: bot
category: reference
summary: Enum of event names for channel group changes. Use these values when subscribing to events on `ChannelGroupClient`.
---

Enum of event names for channel group changes. Use these values when subscribing to events on `ChannelGroupClient`.

## Enumeration Members

### ChannelGroupCreated

> **ChannelGroupCreated**: `"channelGroup.created"`

Fired when a channel group becomes visible to your code. This includes newly created channel groups and existing channel groups that your code can now see due to permission changes.

### ChannelGroupDeleted

> **ChannelGroupDeleted**: `"channelGroup.deleted"`

Fired when a channel group is no longer visible to your code. This includes deleted channel groups and existing channel groups that your code can no longer see due to permission changes.

### ChannelGroupEdited

> **ChannelGroupEdited**: `"channelGroup.edited"`

Fired when a visible channel group's properties or permissions change.

### ChannelGroupMoved

> **ChannelGroupMoved**: `"channelGroup.moved"`

Fired when a visible channel group is moved to a different position.