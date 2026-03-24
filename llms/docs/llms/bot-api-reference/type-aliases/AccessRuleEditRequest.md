---
path: bot-api-reference/type-aliases/AccessRuleEditRequest.md
audience: bot
category: reference
summary: Request object for modifying an existing access rule's permission overlay.
---

> **AccessRuleEditRequest** = `object`

Request object for modifying an existing access rule's permission overlay.

## Properties

### channelOrChannelGroupId

> **channelOrChannelGroupId**: [`ChannelOrChannelGroupGuid`](ChannelOrChannelGroupGuid.md)

The `ChannelOrChannelGroupUuid` identifying the channel or channel group the access rule applies to. Required.

### overlay

> **overlay**: [`ChannelOverlayPermission`](ChannelOverlayPermission.md)

The new `ChannelOverlayPermission` object specifying the updated permission overrides. Required. This replaces the existing overlay entirely.

### roleOrMemberId

> **roleOrMemberId**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)

The `RoleOrMemberUuid` identifying the role or member the access rule applies to. Required.