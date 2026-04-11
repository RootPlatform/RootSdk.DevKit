---
path: bot-api-reference/type-aliases/CommunityMemberRoleSetPrimaryEvent.md
audience: bot
category: reference
summary: Event payload emitted when a member's primary role is changed. The primary role determines the color of the member's name in the UI.
---

> **CommunityMemberRoleSetPrimaryEvent** = `object`

Event payload emitted when a member's primary role is changed. The primary role determines the color of the member's name in the UI. It does not affect permissions.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the new primary role.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the member whose primary role changed.