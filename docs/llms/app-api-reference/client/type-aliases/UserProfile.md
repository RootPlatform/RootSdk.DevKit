---
path: app-api-reference/client/type-aliases/UserProfile.md
audience: app
category: reference
summary: A community member's profile as seen by the current user. Returned by `rootClient.users.getUserProfile()` and emitted by the `user.profile.update`...
---

> **UserProfile** = `object`

A community member's profile as seen by the current user. Returned by `rootClient.users.getUserProfile()` and emitted by the `user.profile.update` event.

## Properties

### id

> **id**: `string`

The member's user ID.

### nickname

> **nickname**: `string`

The member's display name in the community.

### onlineStatus

> **onlineStatus**: [`CommunityUserOnlineStatus`](../enumerations/CommunityUserOnlineStatus.md)

The member's computed online status. See `CommunityUserOnlineStatus`.

### profilePictureUri?

> `optional` **profilePictureUri**: `string`

The asset URI of the member's profile picture. Optional.