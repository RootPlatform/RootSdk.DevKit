---
path: app-api-reference/server/type-aliases/ChannelGroupEditRequest.md
audience: app
category: reference
summary: Request to edit an existing channel group.
---

> **ChannelGroupEditRequest** = `object`

Request to edit an existing channel group.

## Properties

### accessRuleUpdate?

> `optional` **accessRuleUpdate?**: [`AccessRuleUpdateRequest`](AccessRuleUpdateRequest.md)

Optional access rule changes to apply. Use this to add, modify, or remove access rules on the channel group.

### id

> **id**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the channel group to edit. Required.

### name

> **name**: `string`

The new display name for the channel group. Required.