---
path: bot-api-reference/type-aliases/AccessRuleUpdateRequest.md
audience: bot
category: reference
summary: Request object for batch creating, editing, and deleting access rules in a single operation.
---

> **AccessRuleUpdateRequest** = `object`

Request object for batch creating, editing, and deleting access rules in a single operation.

## Properties

### creates?

> `optional` **creates?**: [`AccessRuleCreateRequest`](AccessRuleCreateRequest.md)[]

Optional array of `AccessRuleCreateRequest` objects for new access rules to create.

### deletes?

> `optional` **deletes?**: [`AccessRuleDeleteRequest`](AccessRuleDeleteRequest.md)[]

Optional array of `AccessRuleDeleteRequest` objects for access rules to remove.

### edits?

> `optional` **edits?**: [`AccessRuleEditRequest`](AccessRuleEditRequest.md)[]

Optional array of `AccessRuleEditRequest` objects for existing access rules to modify.