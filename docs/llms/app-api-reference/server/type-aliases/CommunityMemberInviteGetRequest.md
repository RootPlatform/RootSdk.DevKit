---
path: app-api-reference/server/type-aliases/CommunityMemberInviteGetRequest.md
audience: app
category: reference
summary: Request object for retrieving a specific member invitation.
---

> **CommunityMemberInviteGetRequest** = `object`

Request object for retrieving a specific member invitation.

## Properties

### invitedUserId

> **invitedUserId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who was invited. Required.

### senderUserId

> **senderUserId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who sent the invitation. Required.