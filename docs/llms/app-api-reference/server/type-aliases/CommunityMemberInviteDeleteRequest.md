---
path: app-api-reference/server/type-aliases/CommunityMemberInviteDeleteRequest.md
audience: app
category: reference
summary: Request object for revoking a pending member invitation.
---

> **CommunityMemberInviteDeleteRequest** = `object`

Request object for revoking a pending member invitation.

## Properties

### invitedUserId

> **invitedUserId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who was invited. Required.

### senderUserId

> **senderUserId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who sent the invitation. Required.