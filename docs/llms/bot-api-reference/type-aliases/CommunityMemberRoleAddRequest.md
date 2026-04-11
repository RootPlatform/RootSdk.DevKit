---
path: bot-api-reference/type-aliases/CommunityMemberRoleAddRequest.md
audience: bot
category: reference
summary: Request object for assigning a role to one or more community members.
---

> **CommunityMemberRoleAddRequest** = `object`

Request object for assigning a role to one or more community members.

## Properties

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role to assign. Required. Cannot be the `@everyone` role.

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs to assign the role to. Required.