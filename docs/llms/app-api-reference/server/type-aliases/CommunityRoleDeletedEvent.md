---
path: app-api-reference/server/type-aliases/CommunityRoleDeletedEvent.md
audience: app
category: reference
summary: Event payload emitted when a role is deleted from the community.
---

> **CommunityRoleDeletedEvent** = `object`

Event payload emitted when a role is deleted from the community. Deletion cascades: the role is removed from all members who had it, and any channel or channel group permission overrides targeting that role are also removed.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the deleted role.