---
path: bot-api-reference/type-aliases/MemberGroupShort.md
audience: bot
category: reference
summary: Lightweight member group metadata returned by `MemberGroupService.list()`. Contains identifying information but no membership data.
---

> **MemberGroupShort** = `object`

Lightweight member group metadata returned by `MemberGroupService.list()`. Contains identifying information but no membership data. To get full membership details, pass the `id` to `MemberGroupService.get()`.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### id

> **id**: [`CustomMemberGroupGuid`](CustomMemberGroupGuid.md)

The unique identifier (`CustomMemberGroupGuid`) for this member group.

### name

> **name**: `string`

A developer-defined label that distinguishes this member group from other member groups on the same resource (`resource_type` + `resource_id`).

### resourceId

> **resourceId**: `string`

### resourceType

> **resourceType**: `string`