---
path: bot-api-reference/type-aliases/CommunityMemberBan.md
audience: bot
category: reference
summary: Represents a ban record for a community member. Bans prevent users from rejoining the community until the ban is deleted or expires.
---

> **CommunityMemberBan** = `object`

Represents a ban record for a community member. Bans prevent users from rejoining the community until the ban is deleted or expires.

## Properties

### agentUserId

> **agentUserId**: [`UserGuid`](UserGuid.md)

The ID of the user who created the ban.

### expiresAt?

> `optional` **expiresAt?**: `Date`

Optional expiration date for the ban. After this date, the ban is no longer enforced. If not set, the ban is permanent until manually deleted.

### id

> **id**: [`CommunityMemberBanGuid`](CommunityMemberBanGuid.md)

The unique identifier for the ban record.

### reason?

> `optional` **reason?**: `string`

Optional reason for the ban. This is stored with the ban record and included in the notification sent to the banned user.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the banned user.