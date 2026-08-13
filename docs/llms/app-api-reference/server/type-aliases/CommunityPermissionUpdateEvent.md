---
path: app-api-reference/server/type-aliases/CommunityPermissionUpdateEvent.md
audience: app
category: reference
summary: Object type with properties: channelGroupsCreated, channelGroupsDeleted, channelGroupsEdited, channelGroupsMoved, ... (Community).
---

> **CommunityPermissionUpdateEvent** = `object`

## Properties

### channelGroupsCreated

> **channelGroupsCreated**: [`ChannelGroupCreatedEvent`](ChannelGroupCreatedEvent.md)[]

### channelGroupsDeleted

> **channelGroupsDeleted**: [`ChannelGroupDeletedEvent`](ChannelGroupDeletedEvent.md)[]

### channelGroupsEdited

> **channelGroupsEdited**: [`ChannelGroupEditedEvent`](ChannelGroupEditedEvent.md)[]

### channelGroupsMoved

> **channelGroupsMoved**: [`ChannelGroupMovedEvent`](ChannelGroupMovedEvent.md)[]

### channelsCreated

> **channelsCreated**: [`ChannelCreatedEvent`](ChannelCreatedEvent.md)[]

### channelsDeleted

> **channelsDeleted**: [`ChannelDeletedEvent`](ChannelDeletedEvent.md)[]

### channelsEdited

> **channelsEdited**: [`ChannelEditedEvent`](ChannelEditedEvent.md)[]

### channelsMoved

> **channelsMoved**: [`ChannelMovedEvent`](ChannelMovedEvent.md)[]

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### communityPermission?

> `optional` **communityPermission?**: [`CommunityPermission`](CommunityPermission.md)