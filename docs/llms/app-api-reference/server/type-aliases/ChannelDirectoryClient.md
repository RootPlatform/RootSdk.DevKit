---
path: app-api-reference/server/type-aliases/ChannelDirectoryClient.md
audience: app
category: reference
summary: Service client for managing directories (folders) within a channel's file system.
---

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

#### Example

```ts
import {
  ChannelDirectory,
  ChannelDirectoryCreateRequest,
  ChannelGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function createExample(
  channelId: ChannelGuid,
): Promise<ChannelDirectory> {
  try {
    // Set up the request
    const request: ChannelDirectoryCreateRequest = {
      channelId: channelId,
      name: "MyChannelDirectoryName",
      parentDirectoryId: undefined,
    };

    // Call the API
    const directory: ChannelDirectory =
      await rootServer.community.channelDirectories.create(request);

    return directory;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "createFile": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `createFile` on the channel

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

#### Example

```ts
import {
  ChannelDirectoryDeleteRequest,
  ChannelGuid,
  DirectoryGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function deleteExample(
  directoryId: DirectoryGuid,
  channelId: ChannelGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelDirectoryDeleteRequest = {
      id: directoryId,
      channelId: channelId,
    };

    // Call the API
    await rootServer.community.channelDirectories.delete(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "manageFiles": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `manageFiles` on the channel

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

#### Example

```ts
import {
  ChannelDirectory,
  ChannelDirectoryEditRequest,
  ChannelGuid,
  DirectoryGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function editExample(
  directoryId: DirectoryGuid,
  channelId: ChannelGuid,
): Promise<ChannelDirectory> {
  try {
    // Set up the request
    const request: ChannelDirectoryEditRequest = {
      id: directoryId,
      channelId: channelId,
      name: "MyNewChannelDirectoryName",
    };

    // Call the API
    const directory: ChannelDirectory =
      await rootServer.community.channelDirectories.edit(request);

    return directory;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "manageFiles": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `manageFiles` on the channel

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

#### Example

```ts
import {
  ChannelDirectory,
  ChannelDirectoryGetRequest,
  ChannelGuid,
  DirectoryGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function getExample(
  channelId: ChannelGuid,
  directoryId: DirectoryGuid,
): Promise<ChannelDirectory> {
  try {
    // Set up the request
    const request: ChannelDirectoryGetRequest = {
      id: directoryId,
      channelId: channelId,
    };

    // Call the API
    const directory: ChannelDirectory =
      await rootServer.community.channelDirectories.get(request);

    return directory;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "viewFile": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `viewFile` on the channel

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

#### Example

```ts
import {
  ChannelDirectory,
  ChannelDirectoryListRequest,
  ChannelGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function listExample(
  channelId: ChannelGuid,
): Promise<ChannelDirectory[]> {
  try {
    // Set up the request
    const request: ChannelDirectoryListRequest = {
      channelId: channelId,
    };

    // Call the API
    const response: ChannelDirectory[] =
      await rootServer.community.channelDirectories.list(request);

    return response;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "viewFile": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `viewFile` on the channel

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

#### Example

```ts
import {
  ChannelDirectoryMoveRequest,
  ChannelGuid,
  DirectoryGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function moveExample(
  directoryId: DirectoryGuid,
  channelId: ChannelGuid,
  oldParentDirectoryId: DirectoryGuid,
  newParentDirectoryId: DirectoryGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelDirectoryMoveRequest = {
      id: directoryId,
      channelId: channelId,
      oldParentDirectoryId: oldParentDirectoryId,
      newParentDirectoryId: newParentDirectoryId,
    };

    // Call the API
    await rootServer.community.channelDirectories.move(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "manageFiles": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `manageFiles` on the channel