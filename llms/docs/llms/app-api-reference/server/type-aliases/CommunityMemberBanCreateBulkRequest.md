---
path: app-api-reference/server/type-aliases/CommunityMemberBanCreateBulkRequest.md
audience: app
category: reference
summary: Request object for banning multiple members from the community in a single operation.
---

> **CommunityMemberBanCreateBulkRequest** = `object`

Request object for banning multiple members from the community in a single operation.

## Properties

### expiresAt?

> `optional` **expiresAt**: `Date`

Optional expiration date for the bans. After this date, the bans are no longer enforced. This expiration is applied to all bans created by this operation.

### reason?

> `optional` **reason**: `string`

Optional reason for the ban. This reason is applied to all bans created by this operation.

### userIds?

> `optional` **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs to ban. Optional, but at least one user ID should be provided for the operation to have effect.