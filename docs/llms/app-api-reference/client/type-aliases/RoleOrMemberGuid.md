---
path: app-api-reference/client/type-aliases/RoleOrMemberGuid.md
audience: app
category: reference
summary: Identifies either a role, user, app, or bot. Branded with `RootGuidType.CommunityRole`, `RootGuidType.Person`, or `RootGuidType.App`.
---

> **RoleOrMemberGuid** = `string` & `object`

Identifies either a role, user, app, or bot. Branded with `RootGuidType.CommunityRole`, `RootGuidType.Person`, or `RootGuidType.App`. Used in access rules and permission operations that can target either a role or a specific member.

## Type Declaration

### __rootGuidType

> **__rootGuidType**: [`CommunityRole`](../enumerations/RootGuidType.md#communityrole) | [`Person`](../enumerations/RootGuidType.md#person) | [`App`](../enumerations/RootGuidType.md#app)