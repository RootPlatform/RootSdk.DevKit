---
path: app-api-reference/server/type-aliases/CommunityMemberBanCreatedEvent.md
audience: app
category: reference
summary: Event payload emitted when a user is banned from the community.
---

> **CommunityMemberBanCreatedEvent** = `object`

Event payload emitted when a user is banned from the community. If the banned user is currently a member, they are immediately removed and a separate `CommunityLeaveEvent` fires with reason `Banned`.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the ban was created.

### reason?

> `optional` **reason?**: `string`

The ban reason provided by the moderator. Optional.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the banned user.