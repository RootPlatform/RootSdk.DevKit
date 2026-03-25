---
path: app-api-reference/server/type-aliases/CommunityMemberRoleSetPrimaryEvent.md
audience: app
category: reference
summary: Event payload emitted when a member's primary displayed role is changed.
---

> **CommunityMemberRoleSetPrimaryEvent** = `object`

Event payload emitted when a member's primary displayed role is changed.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role that is now the member's primary role.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the member whose primary role was changed.