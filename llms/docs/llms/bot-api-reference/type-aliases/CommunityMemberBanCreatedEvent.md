---
path: bot-api-reference/type-aliases/CommunityMemberBanCreatedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a member is banned from the community.
---

> **CommunityMemberBanCreatedEvent** = `object`

Event payload emitted when a member is banned from the community.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community where the ban occurred.

### reason?

> `optional` **reason**: `string`

Optional reason for the ban, if one was provided when creating the ban.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user who was banned.