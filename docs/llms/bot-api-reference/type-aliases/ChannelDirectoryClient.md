---
path: bot-api-reference/type-aliases/ChannelDirectoryClient.md
audience: bot
category: reference
summary: Service client for managing directories (folders) within a channel's file system.
---

> **Worked sample**: `api-samples/server-directories/` — Channel Directories

> **ChannelDirectoryClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`ChannelDirectoryEvents`](ChannelDirectoryEvents.md)> & `object`

Service client for managing directories (folders) within a channel's file system. Directories organize files hierarchically and can be nested to create folder structures.

Access this client via `rootServer.community.channelDirectories`.

## Type Declaration

### create()

> **create**(`request`: [`ChannelDirectoryCreateRequest`](ChannelDirectoryCreateRequest.md)): `Promise`<[`ChannelDirectory`](ChannelDirectory.md)>

Creates a new directory in a channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelDirectoryCreateRequest`](ChannelDirectoryCreateRequest.md) | The directory configuration including channel, name, and optional parent directory. |

#### Returns

`Promise`<[`ChannelDirectory`](ChannelDirectory.md)>

A promise that resolves to the created `ChannelDirectory` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, or `RequestValidationFailed` if the request is invalid.

### delete()

> **delete**(`request`: [`ChannelDirectoryDeleteRequest`](ChannelDirectoryDeleteRequest.md)): `Promise`<`void`>

Deletes a directory and all its contents (files and subdirectories).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelDirectoryDeleteRequest`](ChannelDirectoryDeleteRequest.md) | Identifies the directory to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the deletion completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the directory does not exist, or `NoPermissionToDelete` if missing required permissions.

### edit()

> **edit**(`request`: [`ChannelDirectoryEditRequest`](ChannelDirectoryEditRequest.md)): `Promise`<[`ChannelDirectoryEditResponse`](ChannelDirectoryEditResponse.md)>

Renames an existing directory.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelDirectoryEditRequest`](ChannelDirectoryEditRequest.md) | Identifies the directory and specifies the new name. |

#### Returns

`Promise`<[`ChannelDirectoryEditResponse`](ChannelDirectoryEditResponse.md)>

A promise that resolves to a `ChannelDirectoryEditResponse` containing the updated directory information.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the directory does not exist, or `NoPermissionToEdit` if missing required permissions.

### get()

> **get**(`request`: [`ChannelDirectoryGetRequest`](ChannelDirectoryGetRequest.md)): `Promise`<[`ChannelDirectory`](ChannelDirectory.md)>

Retrieves a single directory by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelDirectoryGetRequest`](ChannelDirectoryGetRequest.md) | Identifies the channel and directory to retrieve. |

#### Returns

`Promise`<[`ChannelDirectory`](ChannelDirectory.md)>

A promise that resolves to the `ChannelDirectory` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the directory does not exist, or `NoPermissionToRead` if missing required permissions.

### list()

> **list**(`request`: [`ChannelDirectoryListRequest`](ChannelDirectoryListRequest.md)): `Promise`<[`ChannelDirectory`](ChannelDirectory.md)[]>

Lists all directories in a channel as a flat array. Use each directory's `parentDirectoryId` property to reconstruct the hierarchy.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelDirectoryListRequest`](ChannelDirectoryListRequest.md) | Identifies the channel to list directories from. |

#### Returns

`Promise`<[`ChannelDirectory`](ChannelDirectory.md)[]>

A promise that resolves to an array of `ChannelDirectory` objects containing all directories in the channel, regardless of nesting depth.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.

### move()

> **move**(`request`: [`ChannelDirectoryMoveRequest`](ChannelDirectoryMoveRequest.md)): `Promise`<[`ChannelDirectoryMoveResponse`](ChannelDirectoryMoveResponse.md)>

Moves a directory to a different parent directory.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelDirectoryMoveRequest`](ChannelDirectoryMoveRequest.md) | Identifies the directory and specifies the old and new parent directories. |

#### Returns

`Promise`<[`ChannelDirectoryMoveResponse`](ChannelDirectoryMoveResponse.md)>

A promise that resolves to a `ChannelDirectoryMoveResponse` containing the move result.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the directory does not exist, or `NoPermissionToMove` if missing required permissions.

