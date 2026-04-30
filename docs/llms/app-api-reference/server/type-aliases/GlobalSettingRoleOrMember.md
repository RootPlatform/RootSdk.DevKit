---
path: app-api-reference/server/type-aliases/GlobalSettingRoleOrMember.md
audience: app
category: reference
summary: A `ReadOnlyMemberGroup` representing the roles and members selected by the community admin.
---

> **GlobalSettingRoleOrMember** = [`ReadOnlyMemberGroup`](ReadOnlyMemberGroup.md)

A `ReadOnlyMemberGroup` representing the roles and members selected by the community admin. This is the runtime type for settings declared with the `roleOrMember` manifest type key.

Use `ReadOnlyMemberGroup` methods to query membership, such as `isMember()` and `getMembers()`.