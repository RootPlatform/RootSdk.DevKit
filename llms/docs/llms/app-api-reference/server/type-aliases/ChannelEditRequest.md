---
path: app-api-reference/server/type-aliases/ChannelEditRequest.md
audience: app
category: reference
summary: Request object for editing an existing channel's properties.
---

> **ChannelEditRequest** = `object`

Request object for editing an existing channel's properties.

## Properties

### accessRuleUpdate?

> `optional` **accessRuleUpdate**: [`AccessRuleUpdateRequest`](AccessRuleUpdateRequest.md)

Optional `AccessRuleUpdateRequest` object containing access rule changes to apply. Allows creating, editing, and deleting access rules in a single operation.

### description?

> `optional` **description**: `string`

Optional new description for the channel.

### iconTokenUri?

> `optional` **iconTokenUri**: `string`

Optional new token URI for the channel icon. Only used when `updateIcon` is true. Obtain this value from the asset upload process.

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel to edit. Required.

### name

> **name**: `string`

The new name for the channel. Required.

### updateIcon

> **updateIcon**: `boolean`

Set to true if the icon should be updated. Required. Must be true even when clearing the icon.

### useChannelGroupPermission

> **useChannelGroupPermission**: `boolean`

When true, the channel inherits permissions from its parent channel group. When false, the channel uses its own permission rules. Required.