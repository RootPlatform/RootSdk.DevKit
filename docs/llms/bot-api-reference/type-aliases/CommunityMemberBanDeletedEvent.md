---
path: bot-api-reference/type-aliases/CommunityMemberBanDeletedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a ban is revoked, allowing the user to rejoin the community.
---

> **CommunityMemberBanDeletedEvent** = `object`

Event payload emitted when a ban is revoked, allowing the user to rejoin the community.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the ban was revoked.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user whose ban was revoked.