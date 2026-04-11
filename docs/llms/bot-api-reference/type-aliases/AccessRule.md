---
path: bot-api-reference/type-aliases/AccessRule.md
audience: bot
category: reference
summary: Represents a permission override for a specific role or member on a specific channel or channel group.
---

> **AccessRule** = `object`

Represents a permission override for a specific role or member on a specific channel or channel group.

Access rules enable fine-grained permission control by allowing or denying specific channel permissions for individual roles or members, independent of their default role permissions.

## Properties

### channelOrChannelGroupId

> **channelOrChannelGroupId**: [`ChannelOrChannelGroupGuid`](ChannelOrChannelGroupGuid.md)

The `ChannelOrChannelGroupUuid` identifying the channel or channel group this access rule applies to.

### overlay

> **overlay**: [`ChannelOverlayPermission`](ChannelOverlayPermission.md)

The `ChannelOverlayPermission` object containing the permission overrides. Each permission can be set to `true` (explicitly allow), `false` (explicitly deny), or left undefined (do not modify).

### roleOrMemberId

> **roleOrMemberId**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)

The `RoleOrMemberUuid` identifying the role or member this access rule applies to.