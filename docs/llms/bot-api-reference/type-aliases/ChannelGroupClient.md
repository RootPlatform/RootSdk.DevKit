---
path: bot-api-reference/type-aliases/ChannelGroupClient.md
audience: bot
category: reference
summary: Service client for managing channel groups within a community.
---

> **ChannelGroupClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`ChannelGroupEvents`](ChannelGroupEvents.md)> & `object`

Service client for managing channel groups within a community. Channel groups are containers that organize channels and define shared permission settings.

Access this client via `rootServer.community.channelGroups`.

## Type Declaration

### create()

> **create**(`request`: [`ChannelGroupCreateRequest`](ChannelGroupCreateRequest.md)): `Promise`<[`ChannelGroup`](ChannelGroup.md)>

Creates a new channel group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelGroupCreateRequest`](ChannelGroupCreateRequest.md) | The channel group configuration. |

#### Returns

`Promise`<[`ChannelGroup`](ChannelGroup.md)>

A promise that resolves to the created `ChannelGroup` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, or `RequestValidationFailed` if the request is invalid.

#### Example

```ts
import {
  ChannelGroup,
  ChannelGroupCreateRequest,
  rootServer,
} from "@rootsdk/server-bot";

export async function createExample(): Promise<ChannelGroup> {
  try {
    // Set up the request
    const request: ChannelGroupCreateRequest = {
      name: "MyChannelGroupName",
      accessRuleCreates: [],
    };

    // Call the API
    const channelGroup: ChannelGroup =
      await rootServer.community.channelGroups.create(request);

    return channelGroup;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### delete()

> **delete**(`request`: [`ChannelGroupDeleteRequest`](ChannelGroupDeleteRequest.md)): `Promise`<`void`>

Deletes a channel group and all channels within it.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelGroupDeleteRequest`](ChannelGroupDeleteRequest.md) | Identifies the channel group to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the deletion completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel group does not exist, or `NoPermissionToDelete` if missing required permissions.

#### Example

```ts
import {
  ChannelGroupDeleteRequest,
  ChannelGroupGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function deleteExample(
  channelGroupId: ChannelGroupGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelGroupDeleteRequest = {
      id: channelGroupId,
    };

    // Call the API
    await rootServer.community.channelGroups.delete(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### edit()

> **edit**(`request`: [`ChannelGroupEditRequest`](ChannelGroupEditRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

Edits an existing channel group's properties including name and permissions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelGroupEditRequest`](ChannelGroupEditRequest.md) | Identifies the channel group and the updates to apply. |
| `eventHandlers?` | \{ `channelGroup.created`: [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); \} | Optional handlers for permission update events. Supported event keys: `channelGroup.created`, `channelGroup.deleted`. |
| `eventHandlers.channelGroup.created?` | [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md) | - |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) | - |

#### Returns

`Promise`<`void`>

A promise that resolves when the edit completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel group does not exist, or `NoPermissionToEdit` if missing required permissions.

#### Example

```ts
import {
  ChannelGroupEditRequest,
  ChannelGroupGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function editExample(
  channelGroupId: ChannelGroupGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelGroupEditRequest = {
      id: channelGroupId,
      name: "MyChannelGroupName",
      accessRuleUpdate: undefined,
    };

    // Call the API
    await rootServer.community.channelGroups.edit(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### get()

> **get**(`request`: [`ChannelGroupGetRequest`](ChannelGroupGetRequest.md)): `Promise`<[`ChannelGroup`](ChannelGroup.md)>

Retrieves a single channel group by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelGroupGetRequest`](ChannelGroupGetRequest.md) | Identifies the channel group to retrieve. |

#### Returns

`Promise`<[`ChannelGroup`](ChannelGroup.md)>

A promise that resolves to the `ChannelGroup` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel group does not exist or your code cannot see it.

#### Example

```ts
import {
  ChannelGroup,
  ChannelGroupGetRequest,
  ChannelGroupGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function getExample(
  channelGroupId: ChannelGroupGuid,
): Promise<ChannelGroup> {
  try {
    // Set up the request
    const request: ChannelGroupGetRequest = {
      id: channelGroupId,
    };

    // Call the API
    const channelGroup: ChannelGroup =
      await rootServer.community.channelGroups.get(request);

    return channelGroup;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### list()

> **list**(): `Promise`<[`ChannelGroup`](ChannelGroup.md)[]>

Lists channel groups in the community that your code can see, sorted by their display order in the sidebar (top to bottom). Channel groups with access rules that exclude your code are not returned.

#### Returns

`Promise`<[`ChannelGroup`](ChannelGroup.md)[]>

A promise that resolves to an array of `ChannelGroup` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.

#### Example

```ts
import {
  ChannelGroup,
  rootServer,
} from "@rootsdk/server-bot";

export async function listExample(): Promise<ChannelGroup[]> {
  try {
    // Call the API
    const channelGroups: ChannelGroup[] =
      await rootServer.community.channelGroups.list();

    return channelGroups;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### move()

> **move**(`request`: [`ChannelGroupMoveRequest`](ChannelGroupMoveRequest.md)): `Promise`<`void`>

Moves a channel group to a different position.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelGroupMoveRequest`](ChannelGroupMoveRequest.md) | Identifies the channel group and its new position. |

#### Returns

`Promise`<`void`>

A promise that resolves when the move completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel group does not exist, or `NoPermissionToMove` if missing required permissions.

#### Example

```ts
import {
  ChannelGroupMoveRequest,
  ChannelGroupGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function moveExample(
  channelGroupId: ChannelGroupGuid,
  beforeChannelGroupId: ChannelGroupGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelGroupMoveRequest = {
      id: channelGroupId,
      beforeChannelGroupId: beforeChannelGroupId,
    };

    // Call the API
    await rootServer.community.channelGroups.move(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```