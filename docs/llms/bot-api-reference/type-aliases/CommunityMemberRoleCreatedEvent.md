---
path: bot-api-reference/type-aliases/CommunityMemberRoleCreatedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a role is assigned to one or more community members.
---

> **CommunityMemberRoleCreatedEvent** = `object`

Event payload emitted when a role is assigned to one or more community members.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role that was assigned.

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs that the role was assigned to.