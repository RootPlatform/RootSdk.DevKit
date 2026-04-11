---
path: app-api-reference/client/enumerations/CommunityUserOnlineStatus.md
audience: app
category: reference
summary: The computed online status of a community member as seen by the current user.
---

The computed online status of a community member as seen by the current user. Different users may see different statuses for the same member depending on friendship and whether the member has this community open. Appears on `UserProfile.onlineStatus`. See `UserOnlineStatus` for the server-side equivalent.

## Enumeration Members

### Away

> **Away**: `4`

The member is idle and viewing a different community. Only visible to friends; non-friends see this member as Offline.

### AwayAndAttached

> **AwayAndAttached**: `2`

The member is idle and has this community open.

### Offline

> **Offline**: `5`

The member is offline or not visible to the current user.

### Online

> **Online**: `3`

The member is online but viewing a different community. Only visible to friends; non-friends see this member as Offline.

### OnlineAndAttached

> **OnlineAndAttached**: `1`

The member is online and has this community open.

### Unspecified

> **Unspecified**: `0`

Status is unknown.