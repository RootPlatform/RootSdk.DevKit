---
path: bot-api-reference/type-aliases/ReadOnlyMemberGroup.md
audience: bot
category: reference
summary: Read-only view of a member group. Contains all the same properties as `MemberGroup` but without mutation methods.
---

> **ReadOnlyMemberGroup** = `object`

Read-only view of a member group. Contains all the same properties as `MemberGroup` but without mutation methods. This is the base type that `MemberGroup` extends.

See `MemberGroup` for property descriptions.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### communityRoleIds

> **communityRoleIds**: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]

### id

> **id**: [`CustomMemberGroupGuid`](CustomMemberGroupGuid.md)

### memberUserIds

> **memberUserIds**: [`UserGuid`](UserGuid.md)[]

### memberUserIdsAsSet

> **memberUserIdsAsSet**: `Set`<[`UserGuid`](UserGuid.md)>

### name

> **name**: `string`

### resourceId

> **resourceId**: `string`

### resourceType

> **resourceType**: `string`

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

## Methods

### isMember()

> **isMember**(`user`: `object`): `Promise`<`boolean`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `user` | \{ `userId`: `string`; \} |
| `user.userId` | `string` |

#### Returns

`Promise`<`boolean`>