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

> `optional` **accessRuleCreates?**: [`AccessRuleCreateRoleOrMemberRequest`](AccessRuleCreateRoleOrMemberRequest.md)[]

Optional array of `AccessRuleCreateRoleOrMemberRequest` objects to define initial access rules for the channel. Each rule specifies a role or member and optional permission overlays.

### channelGroupId

> **channelGroupId**: [`ChannelGroupGuid`](ChannelGroupGuid.md)

The ID of the channel group where the channel will be created. Required.

### channelType

> **channelType**: `number`

The type of channel to create. Required. Use the `ChannelType` enum values: `Text` (1), `ThreadedText` (2), `Voice` (4), or `App` (8).

### description?

> `optional` **description?**: `string`

Optional description for the channel. Maximum 256 characters. Allowed characters are letters A to Z, numbers, spaces, and common punctuation. Line breaks, emoji, and letters outside A to Z are not allowed. A description that violates these rules fails with `RequestValidationFailed`.

### iconTokenUri?

> `optional` **iconTokenUri?**: `string`

Optional token URI for the channel icon. Obtain this value from the asset upload process.

### name

> **name**: `string`

The display name for the new channel. Required. Must be 1 to 100 characters and contain only letters, numbers, and hyphens. Spaces are not allowed, and the name cannot start or end with a hyphen or contain consecutive hyphens. Uppercase and lowercase letters are both accepted. A name that violates these rules fails with `RequestValidationFailed`. To build a channel name from arbitrary text, replace each run of disallowed characters with a single hyphen and trim leading and trailing hyphens.

### useChannelGroupPermission

> **useChannelGroupPermission**: `boolean`

When true, the channel inherits permissions from its parent channel group. When false, the channel uses its own permission rules defined by access rules. Required.