---
path: app-api-reference/server/type-aliases/CommunityMemberBanKickBulkRequest.md
audience: app
category: reference
summary: Request object for kicking multiple members from the community in a single operation.
---

> **CommunityMemberBanKickBulkRequest** = `object`

Request object for kicking multiple members from the community in a single operation.

## Properties

### userIds?

> `optional` **userIds?**: [`UserGuid`](UserGuid.md)[]

Array of user IDs to kick. Optional, but at least one user ID should be provided for the operation to have effect.