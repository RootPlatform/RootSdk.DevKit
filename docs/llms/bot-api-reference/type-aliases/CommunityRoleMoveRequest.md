---
path: bot-api-reference/type-aliases/CommunityRoleMoveRequest.md
audience: bot
category: reference
summary: Request object for changing a role's display position.
---

> **CommunityRoleMoveRequest** = `object`

Request object for changing a role's display position.

## Properties

### beforeCommunityRoleId?

> `optional` **beforeCommunityRoleId?**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The ID of an existing role that the moved role should be placed after. The moved role is inserted immediately after `beforeCommunityRoleId` in sort order. Optional.

- **Omitted or empty**: The role is placed first (top of the list).
- **Any other role**: The role is inserted immediately after the referenced role.

For example, given roles ordered `A → B → C → D`, moving role `D` with `beforeCommunityRoleId: B` produces `A → B → D → C`. `D` is pulled from its current position and inserted immediately after `B`.

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role to move. Required.