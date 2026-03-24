---
path: app-api-reference/server/type-aliases/MessageReferenceMapCommunityRole.md
audience: app
category: reference
summary: A resolved role mention containing the role ID and its current name.
---

> **MessageReferenceMapCommunityRole** = `object`

A resolved role mention containing the role ID and its current name.

## Properties

### communityRoleId

> **communityRoleId**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the mentioned role.

### name

> **name**: `string`

The current name of the role. This value is resolved when the message is retrieved, so it reflects the role's current name, not the name at the time the message was sent. For `@All` and `@Here` mentions, the name is "All" or "Here" respectively.