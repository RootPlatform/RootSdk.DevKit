---
path: app-api-reference/server/type-aliases/CommunityPermissionUpdateEvent.md
audience: app
category: reference
summary: Object type with properties: channelGroupsCreated, channelGroupsDeleted, channelGroupsEdited, channelGroupsMoved, ... (Community).
---

> **CommunityPermissionUpdateEvent** = `object`

## Properties

### channelGroupsCreated?

> `optional` **channelGroupsCreated**: [`ChannelGroupCreatedEvent`](ChannelGroupCreatedEvent.md)[]

### channelGroupsDeleted?

> `optional` **channelGroupsDeleted**: [`ChannelGroupDeletedEvent`](ChannelGroupDeletedEvent.md)[]

### channelGroupsEdited?

> `optional` **channelGroupsEdited**: [`ChannelGroupEditedEvent`](ChannelGroupEditedEvent.md)[]

### channelGroupsMoved?

> `optional` **channelGroupsMoved**: [`ChannelGroupMovedEvent`](ChannelGroupMovedEvent.md)[]

### channelsCreated?

> `optional` **channelsCreated**: [`ChannelCreatedEvent`](ChannelCreatedEvent.md)[]

### channelsDeleted?

> `optional` **channelsDeleted**: [`ChannelDeletedEvent`](ChannelDeletedEvent.md)[]

### channelsEdited?

> `optional` **channelsEdited**: [`ChannelEditedEvent`](ChannelEditedEvent.md)[]

### channelsMoved?

> `optional` **channelsMoved**: [`ChannelMovedEvent`](ChannelMovedEvent.md)[]

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### communityPermission?

> `optional` **communityPermission**: [`CommunityPermission`](CommunityPermission.md)