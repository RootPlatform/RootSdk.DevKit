---
path: app-api-reference/server/enumerations/CommunityRoleEvent.md
audience: app
category: reference
summary: Enum providing string constants for role event names. Use these values when subscribing to events on `CommunityRoleClient`.
---

Enum providing string constants for role event names. Use these values when subscribing to events on `CommunityRoleClient`.

## Enumeration Members

### CommunityRoleCreated

> **CommunityRoleCreated**: `"communityRole.created"`

Emitted when a new role is created in the community.

### CommunityRoleDeleted

> **CommunityRoleDeleted**: `"communityRole.deleted"`

Emitted when a role is deleted from the community.

### CommunityRoleEdited

> **CommunityRoleEdited**: `"communityRole.edited"`

Emitted when a role's properties are modified, including name, color, or permissions.

### CommunityRoleMoved

> **CommunityRoleMoved**: `"communityRole.moved"`

Emitted when a role's display position changes.