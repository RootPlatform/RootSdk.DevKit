---
path: app-api-reference/server/type-aliases/CommunityLeaveEvent.md
audience: app
category: reference
summary: Event payload emitted when a user leaves the community, whether voluntarily, by being kicked, or by being banned.
---

> **CommunityLeaveEvent** = `object`

Event payload emitted when a user leaves the community, whether voluntarily, by being kicked, or by being banned.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community the user left.

### leaveReason

> **leaveReason**: [`CommunityLeaveReason`](../enumerations/CommunityLeaveReason.md)

Why the user left. See `CommunityLeaveReason` for possible values (`User`, `Kicked`, or `Banned`).

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who left.