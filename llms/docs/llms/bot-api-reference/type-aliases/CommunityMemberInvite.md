---
path: bot-api-reference/type-aliases/CommunityMemberInvite.md
audience: bot
category: reference
summary: Represents a pending invitation for a user to join a community.
---

> **CommunityMemberInvite** = `object`

Represents a pending invitation for a user to join a community. Invitations are created when an existing community member invites another user and remain pending until the invited user accepts, declines, or the invitation is revoked.

## Properties

### communityRoleIds?

> `optional` **communityRoleIds**: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]

Optional array of role IDs that will be assigned to the invited user when they accept the invitation. If not specified, the user receives only the default `@everyone` role.

### id

> **id**: [`CommunityMemberInviteGuid`](CommunityMemberInviteGuid.md)

The unique identifier for the invitation.

### invitedUserId

> **invitedUserId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who was invited to join the community.

### invitedUsername

> **invitedUsername**: `string`

The username of the invited user at the time the invitation was created.

### senderUserId

> **senderUserId**: [`UserGuid`](UserGuid.md)

The unique identifier of the community member who sent the invitation.