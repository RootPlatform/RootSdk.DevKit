---
path: app-api-reference/server/type-aliases/AccessRuleCreateRequest.md
audience: app
category: reference
summary: Request object for creating a new access rule that overrides permissions for a role or member on a channel or channel group.
---

> **AccessRuleCreateRequest** = `object`

Request object for creating a new access rule that overrides permissions for a role or member on a channel or channel group.

## Properties

### channelOrChannelGroupId

> **channelOrChannelGroupId**: [`ChannelOrChannelGroupGuid`](ChannelOrChannelGroupGuid.md)

The `ChannelOrChannelGroupUuid` identifying the channel or channel group to apply the access rule to. Required.

### overlay?

> `optional` **overlay?**: [`ChannelOverlayPermission`](ChannelOverlayPermission.md)

Optional `ChannelOverlayPermission` object specifying the permission overrides. Each property can be set to `true` (explicitly allow), `false` (explicitly deny), or left undefined (inherit from role). If not provided, creates an access rule with no explicit overrides.

### roleOrMemberId

> **roleOrMemberId**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)

The `RoleOrMemberUuid` identifying the role or member to create the access rule for. Required.