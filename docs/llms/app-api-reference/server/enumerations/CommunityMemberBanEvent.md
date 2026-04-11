---
path: app-api-reference/server/enumerations/CommunityMemberBanEvent.md
audience: app
category: reference
summary: Enum providing string constants for community member ban event names. Use these values when subscribing to events on `CommunityMemberBanClient`.
---

Enum providing string constants for community member ban event names. Use these values when subscribing to events on `CommunityMemberBanClient`.

## Enumeration Members

### CommunityMemberBanCreated

> **CommunityMemberBanCreated**: `"communityMemberBan.created"`

Emitted when a member is banned from the community.

### CommunityMemberBanDeleted

> **CommunityMemberBanDeleted**: `"communityMemberBan.deleted"`

Emitted when a ban is removed, allowing the user to rejoin the community.