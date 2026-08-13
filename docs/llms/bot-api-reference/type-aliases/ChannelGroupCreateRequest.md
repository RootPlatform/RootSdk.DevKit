---
path: bot-api-reference/type-aliases/ChannelGroupCreateRequest.md
audience: bot
category: reference
summary: Request to create a new channel group in the community.
---

> **ChannelGroupCreateRequest** = `object`

Request to create a new channel group in the community.

## Properties

### accessRuleCreates?

> `optional` **accessRuleCreates?**: [`AccessRuleCreateRoleOrMemberRequest`](AccessRuleCreateRoleOrMemberRequest.md)[]

Optional array of access rules to create for this channel group. Each entry specifies a role or member and their permissions.

### name

> **name**: `string`

The display name for the new channel group. Required.