---
path: bot-api-reference/type-aliases/CommunityRoleDeletedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a role is deleted from the community.
---

> **CommunityRoleDeletedEvent** = `object`

Event payload emitted when a role is deleted from the community.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the role was deleted.

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the deleted role.