---
path: bot-api-reference/type-aliases/CommunityMemberRoleClient.md
audience: bot
category: reference
summary: Service client for managing role assignments on community members.
---

> **Worked sample**: `api-samples/server-member-roles/` — Member Roles

> **CommunityMemberRoleClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`CommunityMemberRoleEvents`](CommunityMemberRoleEvents.md)> & `object`

Service client for managing role assignments on community members. Use this client to add roles to members, remove roles from members, list a member's roles, or set a member's primary displayed role.

This client manages the assignment of existing roles to members. To create, edit, or delete roles themselves, use `CommunityRoleClient`.

Access this client via `rootServer.community.communityMemberRoles`.

## Type Declaration

### add()

> **add**(`request`: [`CommunityMemberRoleAddRequest`](CommunityMemberRoleAddRequest.md)): `Promise`<`void`>

Assigns a role to one or more community members.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberRoleAddRequest`](CommunityMemberRoleAddRequest.md) | The role ID and array of user IDs to assign the role to. |

#### Returns

`Promise`<`void`>

A promise that resolves when the role has been assigned.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role or any user does not exist, or `NoPermissionToAdd` if missing required permissions or attempting to assign the `@everyone` role.

### list()

> **list**(`request`: [`CommunityMemberRoleListRequest`](CommunityMemberRoleListRequest.md)): `Promise`<[`CommunityMemberRoleListResponse`](CommunityMemberRoleListResponse.md)>

Lists all roles assigned to a specific community member.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberRoleListRequest`](CommunityMemberRoleListRequest.md) | Identifies the member by user ID. |

#### Returns

`Promise`<[`CommunityMemberRoleListResponse`](CommunityMemberRoleListResponse.md)>

A promise that resolves to a `CommunityMemberRoleListResponse` containing the member's role IDs.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if the caller is not a member of the community.

### remove()

> **remove**(`request`: [`CommunityMemberRoleRemoveRequest`](CommunityMemberRoleRemoveRequest.md)): `Promise`<`void`>

Removes a role from one or more community members.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberRoleRemoveRequest`](CommunityMemberRoleRemoveRequest.md) | The role ID and array of user IDs to remove the role from. |

#### Returns

`Promise`<`void`>

A promise that resolves when the role has been removed.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role or any user does not exist, or `NoPermissionToDelete` if missing required permissions or attempting to remove the `@everyone` role.

### setPrimary()

> **setPrimary**(`request`: [`CommunityMemberRoleSetPrimaryRequest`](CommunityMemberRoleSetPrimaryRequest.md)): `Promise`<`void`>

Sets a member's primary role, which determines their displayed role name and color.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberRoleSetPrimaryRequest`](CommunityMemberRoleSetPrimaryRequest.md) | The user ID and the role ID to set as primary. |

#### Returns

`Promise`<`void`>

A promise that resolves when the primary role has been set.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role does not exist, or `NoPermissionToAdd` if missing required permissions or attempting to set `@everyone` as primary.

