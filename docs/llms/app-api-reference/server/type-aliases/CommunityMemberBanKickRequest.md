---
path: app-api-reference/server/type-aliases/CommunityMemberBanKickRequest.md
audience: app
category: reference
summary: Request object for kicking a single member from the community. Kicking removes a member without creating a ban record, allowing them to rejoin.
---

> **CommunityMemberBanKickRequest** = `object`

Request object for kicking a single member from the community. Kicking removes a member without creating a ban record, allowing them to rejoin.

## Properties

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user to kick. Required.