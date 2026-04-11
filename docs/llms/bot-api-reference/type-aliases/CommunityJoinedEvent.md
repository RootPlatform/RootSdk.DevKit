---
path: bot-api-reference/type-aliases/CommunityJoinedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user joins the community.
---

> **CommunityJoinedEvent** = `object`

Event payload emitted when a user joins the community.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community the user joined.

### communityRoleIds

> **communityRoleIds**: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]

The roles assigned to the new member on join, including the `@everyone` role.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who joined.