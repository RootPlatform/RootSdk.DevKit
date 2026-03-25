---
path: bot-api-reference/type-aliases/CommunityMemberDetachEvent.md
audience: bot
category: reference
summary: Event payload emitted every time a community member closes the community on any device.
---

> **CommunityMemberDetachEvent** = `object`

Event payload emitted every time a community member closes the community on any device. If a member has multiple devices, this event fires for each one. To distinguish between last device vs. one of many, use `ClientEvent` instead. See Client attachment for details on how attachment works.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the member who detached.