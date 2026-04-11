---
path: app-api-reference/server/type-aliases/CommunityRoleDeleteRequest.md
audience: app
category: reference
summary: Request object for deleting a role from the community.
---

> **CommunityRoleDeleteRequest** = `object`

Request object for deleting a role from the community.

## Properties

### id

> **id**: [`CommunityRoleGuid`](CommunityRoleGuid.md)

The unique identifier of the role to delete. Required. The default `@everyone` role cannot be deleted.