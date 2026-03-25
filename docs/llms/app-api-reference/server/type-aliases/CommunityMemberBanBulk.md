---
path: app-api-reference/server/type-aliases/CommunityMemberBanBulk.md
audience: app
category: reference
summary: Response object for bulk ban operations, indicating which users were successfully banned.
---

> **CommunityMemberBanBulk** = `object`

Response object for bulk ban operations, indicating which users were successfully banned.

## Properties

### userIds?

> `optional` **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs that were successfully banned. Users who were not community members or could not be banned are not included in this array.