---
path: bot-api-reference/type-aliases/CommunityRoleMovedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a role's display position changes.
---

> **CommunityRoleMovedEvent** = `object`

Event payload emitted when a role's display position changes.

## Properties

### beforeCommunityRoleId?

> `optional` **beforeCommunityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The ID of the role that now appears after the moved role in the list. May be undefined if the role was moved to the top of the list.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the role was moved.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the moved role.