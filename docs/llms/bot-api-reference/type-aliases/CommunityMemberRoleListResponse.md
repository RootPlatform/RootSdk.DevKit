---
path: bot-api-reference/type-aliases/CommunityMemberRoleListResponse.md
audience: bot
category: reference
summary: Response object containing the roles assigned to a community member.
---

> **CommunityMemberRoleListResponse** = `object`

Response object containing the roles assigned to a community member.

## Properties

### communityRoleIds

> **communityRoleIds**: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]

Array of role IDs assigned to this member. Always includes the `@everyone` role. Use `WellKnownRootGuids.CommunityRoles.EveryoneRole` to identify it.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the member.