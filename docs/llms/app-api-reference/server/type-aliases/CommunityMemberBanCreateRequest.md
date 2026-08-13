---
path: app-api-reference/server/type-aliases/CommunityMemberBanCreateRequest.md
audience: app
category: reference
summary: Request object for banning a single member from the community.
---

> **CommunityMemberBanCreateRequest** = `object`

Request object for banning a single member from the community.

## Properties

### expiresAt?

> `optional` **expiresAt?**: `Date`

Optional expiration date for the ban. After this date, the ban is no longer enforced. If not provided, the ban is permanent until manually deleted.

### reason?

> `optional` **reason?**: `string`

Optional reason for the ban. This is stored with the ban record and included in the notification sent to the banned user.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user to ban. Required.