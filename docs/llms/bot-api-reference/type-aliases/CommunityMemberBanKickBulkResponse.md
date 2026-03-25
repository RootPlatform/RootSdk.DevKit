---
path: bot-api-reference/type-aliases/CommunityMemberBanKickBulkResponse.md
audience: bot
category: reference
summary: Response object for bulk kick operations, indicating which users were successfully kicked.
---

> **CommunityMemberBanKickBulkResponse** = `object`

Response object for bulk kick operations, indicating which users were successfully kicked.

## Properties

### userIds?

> `optional` **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs that were successfully kicked. Users who were not community members are not included in this array.