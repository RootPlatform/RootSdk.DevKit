---
path: bot-api-reference/enumerations/MemberGroupEvent.md
audience: bot
category: reference
summary: Enum providing string constants for member group event names. Use these values when subscribing to events on `rootServer.memberGroups`.
---

Enum providing string constants for member group event names. Use these values when subscribing to events on `rootServer.memberGroups`.

## Enumeration Members

### MembersAdded

> **MembersAdded**: `"members.added"`

Emitted when users are added to a member group, either directly or through community role membership changes.

### MembersRemoved

> **MembersRemoved**: `"members.removed"`

Emitted when users are removed from a member group, either directly or because they left the community, lost a community role, or a community role was deleted.

### StateChanged

> **StateChanged**: `"state.changed"`

Emitted when a member group's community role list changes, even if the resolved membership hasn't changed yet. This fires when roles are added or removed from the group definition.

### UserGroupEmptied

> **UserGroupEmptied**: `"userGroup.empty"`

Emitted when a member group's resolved membership becomes empty (all users have been removed).