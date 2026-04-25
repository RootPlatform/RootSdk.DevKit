---
path: bot-api-reference/type-aliases/ChannelGroupClient.md
audience: bot
category: reference
summary: Service client for managing channel groups within a community.
---

> **Worked sample**: `api-samples/server-channel-groups/` — Channel Groups

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

### list()

> **list**(): `Promise`<[`ChannelGroup`](ChannelGroup.md)[]>

Lists channel groups in the community that your code can see, sorted by their display order in the sidebar (top to bottom). Channel groups with access rules that exclude your code are not returned.

#### Returns

`Promise`<[`ChannelGroup`](ChannelGroup.md)[]>

A promise that resolves to an array of `ChannelGroup` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.

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

