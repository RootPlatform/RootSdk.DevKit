---
path: app-api-reference/server/type-aliases/MemberGroupClient.md
audience: app
category: reference
summary: Manages custom groups of users and community roles. Member groups let you define audiences by combining individual users and community roles into a...
---

> **Worked sample**: `api-samples/server-member-groups/` — Member Groups

> **MemberGroupClient** = `MemberGroupClientBase` & `object`

Manages custom groups of users and community roles. Member groups let you define audiences by combining individual users and community roles into a single group, then use that group for targeting broadcasts or organizing access control.

Available via `rootServer.memberGroups`.

## Type Declaration

### create()

> **create**(`data`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md)>

Creates a new member group assigned to a resource.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | \{ `communityRoleIds`: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]; `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; `userIds`: [`UserGuid`](UserGuid.md)[]; \} | An object describing the member group to create. |
| `data.communityRoleIds` | [`CommunityRoleGuid`](CommunityRoleGuid.md)[] | An array of community role IDs. Users with these roles are included in the group's resolved membership. |
| `data.name` | `string` | The name for this member group. |
| `data.resourceId` | `string` | The resource ID for this member group. |
| `data.resourceType` | `string` | The resource type for this member group. |
| `data.userIds` | [`UserGuid`](UserGuid.md)[] | An array of user IDs to add as direct members. |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)>

A promise that resolves with the created member group.

#### Throws

`Error` If a member group with the same `resourceType`, `resourceId`, and `name` already exists in the community.

### getByName()

> **getByName**(`query`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

Retrieves a member group by its `resourceType`, `resourceId`, and `name`. All three must match.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | \{ `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; \} |
| `query.name` | `string` |
| `query.resourceId` | `string` |
| `query.resourceType` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

A promise that resolves with the member group if found, otherwise `undefined`.

### list()

> **list**(): `Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

Lists all member groups in the current community. Returns lightweight `MemberGroupShort` objects containing only metadata (no membership data).

#### Returns

`Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

A promise that resolves with an array of member group summaries. Returns an empty array if the community has no member groups.

### listByResourceId()

> **listByResourceId**(`query`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md)[]>

Lists all member groups that match both the given `resourceType` and `resourceId`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `query` | \{ `resourceId`: `string`; `resourceType`: `string`; \} | An object identifying the resource. |
| `query.resourceId` | `string` | The resource ID to match. |
| `query.resourceType` | `string` | The resource type to match. |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)[]>

A promise that resolves with an array of matching member groups. Returns an empty array if no matches are found.

### listResourceIdsForUserId()

> **listResourceIdsForUserId**(`query`: `object`, `user`: `object`): `Promise`<`string`[]>

Lists resource IDs where a user is a member of a group with the specified resource type and name. Use this to find which resources a user has access to through member group membership.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `query` | \{ `name`: `string`; `resourceType`: `string`; \} | An object identifying the group criteria. |
| `query.name` | `string` | The member group name to match. |
| `query.resourceType` | `string` | The resource type to match. |
| `user` | \{ `userId`: [`UserGuid`](UserGuid.md); \} | An object identifying the user. |
| `user.userId` | [`UserGuid`](UserGuid.md) | The user ID to check membership for. |

#### Returns

`Promise`<`string`[]>

A promise that resolves with an array of resource IDs where the user is a member of a matching group. Returns an empty array if no matches are found.