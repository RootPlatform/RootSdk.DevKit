---
path: app-api-reference/server/type-aliases/CommunityMemberRoleDeletedEvent.md
audience: app
category: reference
summary: Event payload emitted when a role is removed from one or more community members.
---

> **CommunityMemberRoleDeletedEvent** = `object`

Event payload emitted when a role is removed from one or more community members.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role that was removed.

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs that the role was removed from.