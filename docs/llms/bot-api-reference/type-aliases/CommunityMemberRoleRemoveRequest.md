---
path: bot-api-reference/type-aliases/CommunityMemberRoleRemoveRequest.md
audience: bot
category: reference
summary: Request object for removing a role from one or more community members.
---

> **CommunityMemberRoleRemoveRequest** = `object`

Request object for removing a role from one or more community members.

## Properties

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role to remove. Required. Cannot be the `@everyone` role.

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs to remove the role from. Required.