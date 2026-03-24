---
path: bot-api-reference/type-aliases/CommunityJoinedEvent.md
audience: bot
category: reference
summary: Event data emitted when a user joins the community.
---

> **CommunityJoinedEvent** = `object`

Event data emitted when a user joins the community.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community the user joined.

### communityRoleIds?

> `optional` **communityRoleIds**: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]

Optional array of role IDs assigned to the user upon joining.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who joined.