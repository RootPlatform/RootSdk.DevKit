---
path: bot-api-reference/type-aliases/AccessRuleCreateRoleOrMemberRequest.md
audience: bot
category: reference
summary: Request object for creating an access rule for a specific role or member.
---

> **AccessRuleCreateRoleOrMemberRequest** = `object`

Request object for creating an access rule for a specific role or member.

## Properties

### overlay?

> `optional` **overlay**: [`ChannelOverlayPermission`](ChannelOverlayPermission.md)

Optional `ChannelOverlayPermission` object specifying the permission overrides for this role or member. If not provided, the role or member is added to the access list without custom permission overlays.

### roleOrMemberId

> **roleOrMemberId**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)

The ID of the role or member to create the access rule for. Required.