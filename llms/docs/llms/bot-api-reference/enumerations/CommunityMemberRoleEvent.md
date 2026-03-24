---
path: bot-api-reference/enumerations/CommunityMemberRoleEvent.md
audience: bot
category: reference
summary: Enum providing string constants for member role event names. Use these values when subscribing to events on `CommunityMemberRoleClient`.
---

Enum providing string constants for member role event names. Use these values when subscribing to events on `CommunityMemberRoleClient`.

## Enumeration Members

### CommunityMemberRoleCreated

> **CommunityMemberRoleCreated**: `"communityMemberRole.created"`

Emitted when a role is assigned to one or more members.

### CommunityMemberRoleDeleted

> **CommunityMemberRoleDeleted**: `"communityMemberRole.deleted"`

Emitted when a role is removed from one or more members.

### CommunityMemberRoleSetPrimary

> **CommunityMemberRoleSetPrimary**: `"communityMemberRole.set.primary"`

Emitted when a member's primary displayed role is changed.