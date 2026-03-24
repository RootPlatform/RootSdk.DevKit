---
path: app-api-reference/server/type-aliases/CommunityMemberBanDeletedEvent.md
audience: app
category: reference
summary: Event payload emitted when a ban is removed from a user.
---

> **CommunityMemberBanDeletedEvent** = `object`

Event payload emitted when a ban is removed from a user.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community where the ban was removed.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user whose ban was removed.