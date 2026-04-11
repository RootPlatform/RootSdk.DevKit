---
path: bot-api-reference/type-aliases/CommunityRoleMovedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a role's display order changes in the community's role list.
---

> **CommunityRoleMovedEvent** = `object`

Event payload emitted when a role's display order changes in the community's role list.

## Properties

### beforeCommunityRoleId?

> `optional` **beforeCommunityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The role that the moved role was placed after. Undefined if the role was moved to the top of the list. Optional.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role that was moved.