---
path: bot-api-reference/type-aliases/MemberGroupService.md
audience: bot
category: reference
summary: Service with methods: create, delete, get, getByName, ... (Member Groups).
---

> **MemberGroupService** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`MemberGroupServiceEvents`](MemberGroupServiceEvents.md)> & `object`

## Type Declaration

### create()

> **create**(`data`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md)>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | \{ `communityId?`: `string`; `communityRoleIds`: `string`[]; `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; `userIds`: `string`[]; \} |
| `data.communityId?` | `string` |
| `data.communityRoleIds` | `string`[] |
| `data.name` | `string` |
| `data.resourceId` | `string` |
| `data.resourceType` | `string` |
| `data.userIds` | `string`[] |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)>

#### Example

```ts
import { rootServer, MemberGroup } from "@rootsdk/server-bot";

export async function createExample(
  resourceType: string,
  resourceId: string,
  name: string,
  userIds: string[],
  communityRoleIds: string[],
): Promise<MemberGroup> {
  try {
    // Set up the request
    const request = {
      resourceType: resourceType,
      resourceId: resourceId,
      name: name,
      userIds: userIds,
      communityRoleIds: communityRoleIds,
    };

    // Call the API
    const result: MemberGroup = await rootServer.memberGroups.create(request);

    return result;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### delete()

> **delete**(`id`: `string`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`Promise`<`void`>

#### Example

```ts
import { rootServer } from "@rootsdk/server-bot";

export async function deleteExample(userGroupId: string): Promise<void> {
  try {
    // Call the API
    await rootServer.memberGroups.delete(userGroupId);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### get()

> **get**(`id`: `string`): `Promise`<[`MemberGroup`](MemberGroup.md)>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)>

#### Example

```ts
import { rootServer, MemberGroup } from "@rootsdk/server-bot";

export async function getExample(
  MemberGroupId: string,
): Promise<MemberGroup | undefined> {
  try {
    // Call the API
    const result: MemberGroup | undefined =
      await rootServer.memberGroups.get(MemberGroupId);

    return result;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### getByName()

> **getByName**(`data`: `object`): `Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | \{ `name`: `string`; `resourceId`: `string`; `resourceType`: `string`; \} |
| `data.name` | `string` |
| `data.resourceId` | `string` |
| `data.resourceType` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md) | `undefined`>

#### Example

```ts
import { rootServer, MemberGroup } from "@rootsdk/server-bot";

export async function getByNameExample(
  resourceType: string,
  resourceId: string,
  name: string,
): Promise<MemberGroup | undefined> {
  try {
    // Set up the request
    const request = {
      resourceType: resourceType,
      resourceId: resourceId,
      name: name,
    };

    // Call the API
    const result: MemberGroup | undefined =
      await rootServer.memberGroups.getByName(request);

    return result;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### list()

> **list**(): `Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

#### Returns

`Promise`<[`MemberGroupShort`](MemberGroupShort.md)[]>

#### Example

```ts
import { MemberGroupShort, rootServer } from "@rootsdk/server-bot";

export async function listExample(): Promise<MemberGroupShort[]> {
  try {
    // Call the API
    const results: MemberGroupShort[] = await rootServer.memberGroups.list();

    return results;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listByIds()

> **listByIds**(`ids`: `string`[]): `Promise`<[`MemberGroup`](MemberGroup.md)[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ids` | `string`[] |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)[]>

#### Example

```ts
import { MemberGroup, rootServer } from "@rootsdk/server-bot";

export async function listByIdsExample(
  userGroupIds: string[],
): Promise<MemberGroup[]> {
  try {
    // Call the API
    const results: MemberGroup[] =
      await rootServer.memberGroups.listByIds(userGroupIds);

    return results;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listByResourceId()

> **listByResourceId**(`query`: `object`, `communityId?`: `string`): `Promise`<[`MemberGroup`](MemberGroup.md)[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | \{ `resourceId`: `string`; `resourceType`: `string`; \} |
| `query.resourceId` | `string` |
| `query.resourceType?` | `string` |
| `communityId?` | `string` |

#### Returns

`Promise`<[`MemberGroup`](MemberGroup.md)[]>

#### Example

```ts
import { MemberGroup, rootServer } from "@rootsdk/server-bot";

export async function listByResourceIdExample(
  resourceType: string,
  resourceId: string,
): Promise<MemberGroup[]> {
  try {
    // Set up the request
    const request = {
      resourceType: resourceType,
      resourceId: resourceId,
    };

    // Call the API
    const results: MemberGroup[] =
      await rootServer.memberGroups.listByResourceId(request);

    return results;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listResourceIdsForUserId()

> **listResourceIdsForUserId**(`query`: `object`, `user`: `object`): `Promise`<`string`[]>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | \{ `name`: `string`; `resourceType`: `string`; \} |
| `query.name` | `string` |
| `query.resourceType` | `string` |
| `user` | \{ `communityId?`: `string`; `userId`: `string`; \} |
| `user.communityId?` | `string` |
| `user.userId` | `string` |

#### Returns

`Promise`<`string`[]>

#### Example

```ts
import { MemberGroup, rootServer } from "@rootsdk/server-bot";

export async function listResourceIdsForUserIdExample(
  resourceType: string,
  userId: string,
  name: string,
): Promise<string[]> {
  try {
    // Set up the request
    const resourceRequest = {
      resourceType: resourceType,
      name: name,
    };
    const userRequest = {
      userId: userId,
    };

    // Call the API
    const results: string[] =
      await rootServer.memberGroups.listResourceIdsForUserId(
        resourceRequest,
        userRequest,
      );

    return results;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```