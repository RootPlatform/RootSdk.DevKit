---
path: app-api-reference/server/type-aliases/CommunityMemberAttachEvent.md
audience: app
category: reference
summary: Event payload emitted every time a community member opens the community on any device.
---

> **CommunityMemberAttachEvent** = `object`

Event payload emitted every time a community member opens the community on any device. If a member has multiple devices, this event fires for each one. To distinguish between first device vs. additional devices, use `ClientEvent` instead. See [Client attachment](../../../app-docs/develop/server/client-attachment.md) for details on how attachment works.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### onlineStatus

> **onlineStatus**: [`UserOnlineStatus`](../enumerations/UserOnlineStatus.md)

The member's online status. See `UserOnlineStatus` for possible values.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the member who attached.