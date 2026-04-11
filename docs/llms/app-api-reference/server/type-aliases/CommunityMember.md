---
path: app-api-reference/server/type-aliases/CommunityMember.md
audience: app
category: reference
summary: Represents a user's membership in a community, including their profile information, assigned roles, and membership dates.
---

> **CommunityMember** = `object`

Represents a user's membership in a community, including their profile information, assigned roles, and membership dates.

## Properties

### communityRoleIds

> **communityRoleIds**: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]

Array of role IDs assigned to this member. Always includes the `@everyone` role. Use `WellKnownRootGuids.CommunityRoles.EveryoneRole` to identify the default role.

### joinedAt?

> `optional` **joinedAt**: `Date`

The date and time when the member joined the community.

### nickname

> **nickname**: `string`

The member's display name within the community.

### primaryCommunityRoleId?

> `optional` **primaryCommunityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The ID of the member's primary role, which determines their displayed role name and color. May be undefined if using the default role.

### primaryCommunityRoleName?

> `optional` **primaryCommunityRoleName**: `string`

The display name of the member's primary role. May be undefined.

### profilePictureAssetUri?

> `optional` **profilePictureAssetUri**: `string`

The URI of the member's profile picture. May be undefined if no picture is set.

### roleColorHex?

> `optional` **roleColorHex**: `string`

The hex color code associated with the member's displayed role color. May be undefined.

### subscribedAt?

> `optional` **subscribedAt**: `Date`

Reserved for future use. Currently, always undefined.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user.