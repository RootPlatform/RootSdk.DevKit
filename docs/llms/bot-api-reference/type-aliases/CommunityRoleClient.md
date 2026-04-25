---
path: bot-api-reference/type-aliases/CommunityRoleClient.md
audience: bot
category: reference
summary: Service client for managing roles within a community. Roles define sets of permissions that can be assigned to community members, controlling what...
---

> **Worked sample**: `api-samples/server-roles/` — Community Roles

> **CommunityRoleClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`CommunityRoleEvents`](CommunityRoleEvents.md)> & `object`

Service client for managing roles within a community. Roles define sets of permissions that can be assigned to community members, controlling what actions they can perform within the community and its channels.

Every community has a default `@everyone` role that cannot be deleted or renamed. Custom roles can be created with specific permission configurations and assigned to members to grant additional capabilities.

Access this client via `rootServer.community.communityRoles`.

## Type Declaration

### create()

> **create**(`request`: [`CommunityRoleCreateRequest`](CommunityRoleCreateRequest.md)): `Promise`<[`CommunityRole`](CommunityRole.md)>

Creates a new role in the community with the specified permissions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleCreateRequest`](CommunityRoleCreateRequest.md) | The role configuration including name, color, and permissions. |

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)>

A promise that resolves to the created `CommunityRole` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, or `NoPermissionToAdd` if attempting to grant permissions that your code does not have.

### delete()

> **delete**(`request`: [`CommunityRoleDeleteRequest`](CommunityRoleDeleteRequest.md)): `Promise`<`void`>

Removes a role from the community. Members who had this role assigned will lose its permissions. The default `@everyone` role cannot be deleted.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleDeleteRequest`](CommunityRoleDeleteRequest.md) | Identifies the role to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the delete operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role does not exist, or `NoPermissionToDelete` if missing required permissions or attempting to delete the `@everyone` role.

### edit()

> **edit**(`request`: [`CommunityRoleEditRequest`](CommunityRoleEditRequest.md)): `Promise`<[`CommunityRole`](CommunityRole.md)>

Modifies an existing role's properties, including name, color, and permissions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleEditRequest`](CommunityRoleEditRequest.md) | The role ID and updated properties. |

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)>

A promise that resolves to the updated `CommunityRole` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role does not exist, `NoPermissionToEdit` if missing required permissions, or `NoPermissionToAdd` if attempting to grant permissions that your code does not have.

### get()

> **get**(`request`: [`CommunityRoleGetRequest`](CommunityRoleGetRequest.md)): `Promise`<[`CommunityRole`](CommunityRole.md)>

Retrieves a single role by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleGetRequest`](CommunityRoleGetRequest.md) | Identifies the role to retrieve. |

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)>

A promise that resolves to the `CommunityRole` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role does not exist, or `NoPermissionToRead` if the caller is not a member of the community.

### list()

> **list**(): `Promise`<[`CommunityRole`](CommunityRole.md)[]>

Lists all roles in the community, including the default `@everyone` role. Roles are returned sorted by display position.

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)[]>

A promise that resolves to an array of `CommunityRole` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if the caller is not a member of the community.

To identify the `@everyone` role, compare against `WellKnownRootGuids.CommunityRoles.EveryoneRole`.

### move()

> **move**(`request`: [`CommunityRoleMoveRequest`](CommunityRoleMoveRequest.md)): `Promise`<`void`>

Changes a role's display position in the role list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleMoveRequest`](CommunityRoleMoveRequest.md) | The role ID and target position. |

#### Returns

`Promise`<`void`>

A promise that resolves when the move operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role or target position role does not exist, or `NoPermissionToEdit` if missing required permissions.

