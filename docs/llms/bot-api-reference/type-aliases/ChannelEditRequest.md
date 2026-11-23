---
path: bot-api-reference/type-aliases/ChannelEditRequest.md
audience: bot
category: reference
summary: Request object for editing an existing channel's properties.
---

> **ChannelEditRequest** = `object`

Request object for editing an existing channel's properties.

## Properties

### accessRuleUpdate?

> `optional` **accessRuleUpdate?**: [`AccessRuleUpdateRequest`](AccessRuleUpdateRequest.md)

Optional `AccessRuleUpdateRequest` object containing access rule changes to apply. Allows creating, editing, and deleting access rules in a single operation.

### description?

> `optional` **description?**: `string`

Optional new description for the channel. Maximum 256 characters. Allowed characters are letters A to Z, numbers, spaces, and common punctuation. Line breaks, emoji, and letters outside A to Z are not allowed. A description that violates these rules fails with `RequestValidationFailed`.

### iconTokenUri?

> `optional` **iconTokenUri?**: `string`

Optional new token URI for the channel icon. Only used when `updateIcon` is true. Obtain this value from the asset upload process.

### id

> **id**: [`ChannelGuid`](ChannelGuid.md)

The unique identifier of the channel to edit. Required.

### name

> **name**: `string`

The new name for the channel. Required. Must be 1 to 100 characters and contain only letters, numbers, and hyphens. Spaces are not allowed, and the name cannot start or end with a hyphen or contain consecutive hyphens. Uppercase and lowercase letters are both accepted. A name that violates these rules fails with `RequestValidationFailed`. To build a channel name from arbitrary text, replace each run of disallowed characters with a single hyphen and trim leading and trailing hyphens.

### updateIcon

> **updateIcon**: `boolean`

Set to true if the icon should be updated. Required. Must be true even when clearing the icon.

### useChannelGroupPermission

> **useChannelGroupPermission**: `boolean`

When true, the channel inherits permissions from its parent channel group. When false, the channel uses its own permission rules. Required.