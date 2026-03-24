---
path: app-api-reference/server/type-aliases/AccessRuleListByRoleOrMemberRequest.md
audience: app
category: reference
summary: Request object for listing all access rules that apply to a specific role or member.
---

> **AccessRuleListByRoleOrMemberRequest** = `object`

Request object for listing all access rules that apply to a specific role or member.

## Properties

### roleOrMemberId?

> `optional` **roleOrMemberId**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)

Optional `RoleOrMemberUuid` identifying the role or member to list access rules for. If not provided, returns all access rules in the community.