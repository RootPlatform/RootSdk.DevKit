---
path: app-api-reference/server/enumerations/CommunityEvent.md
audience: app
category: reference
summary: Enum providing string constants for community event names. Use these values when subscribing to events on `CommunityClient`.
---

Enum providing string constants for community event names. Use these values when subscribing to events on `CommunityClient`.

## Enumeration Members

### CommunityEdited

> **CommunityEdited**: `"community.edited"`

Emitted when a community's properties are modified.

### CommunityJoined

> **CommunityJoined**: `"community.joined"`

Emitted when a user joins the community.

### CommunityLeave

> **CommunityLeave**: `"community.leave"`

Emitted when a user leaves the community (voluntarily, by kick, or by ban).