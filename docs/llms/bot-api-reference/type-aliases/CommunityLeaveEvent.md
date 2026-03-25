---
path: bot-api-reference/type-aliases/CommunityLeaveEvent.md
audience: bot
category: reference
summary: Event data emitted when a user leaves the community.
---

> **CommunityLeaveEvent** = `object`

Event data emitted when a user leaves the community.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community the user left.

### leaveReason

> **leaveReason**: [`CommunityLeaveReason`](../enumerations/CommunityLeaveReason.md)

A `CommunityLeaveReason` value indicating why the user left.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who left.