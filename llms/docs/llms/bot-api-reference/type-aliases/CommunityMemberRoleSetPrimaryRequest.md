---
path: bot-api-reference/type-aliases/CommunityMemberRoleSetPrimaryRequest.md
audience: bot
category: reference
summary: Request object for setting a member's primary displayed role.
---

> **CommunityMemberRoleSetPrimaryRequest** = `object`

Request object for setting a member's primary displayed role.

## Properties

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role to set as primary. Required. The member must already have this role assigned. Cannot be the `@everyone` role.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the member. Required.