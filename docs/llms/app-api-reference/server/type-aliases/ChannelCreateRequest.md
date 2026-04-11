---
path: app-api-reference/server/type-aliases/ChannelCreateRequest.md
audience: app
category: reference
summary: Request object for creating a new channel within a channel group.
---

> **ChannelCreateRequest** = `object`

Request object for creating a new channel within a channel group.

## Properties

### accessRuleCreates?

> `optional` **accessRuleCreates**: [`AccessRuleCreateRoleOrMemberRequest`](AccessRuleCreateRoleOrMemberRequest.md)[]

Optional array of `AccessRuleCreateRoleOrMemberRequest` objects to define initial access rules for the channel. Each rule specifies a role or member and optional permission overlays.

### channelGroupId

> **channelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the channel group where the channel will be created. Required.

### channelType

> **channelType**: `number`

The type of channel to create. Required. Use the `ChannelType` enum values: `Text` (1), `ThreadedText` (2), `Voice` (4), or `App` (8).

### description?

> `optional` **description**: `string`

Optional description for the channel.

### iconTokenUri?

> `optional` **iconTokenUri**: `string`

Optional token URI for the channel icon. Obtain this value from the asset upload process.

### name

> **name**: `string`

The display name for the new channel. Required.

### useChannelGroupPermission

> **useChannelGroupPermission**: `boolean`

When true, the channel inherits permissions from its parent channel group. When false, the channel uses its own permission rules defined by access rules. Required.