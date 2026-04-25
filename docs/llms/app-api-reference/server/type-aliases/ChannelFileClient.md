---
path: app-api-reference/server/type-aliases/ChannelFileClient.md
audience: app
category: reference
summary: Service client for managing files within channel directories. Files are stored in directories and linked to assets in the asset system.
---

> **Worked sample**: `api-samples/server-files/` — Channel Files

> **ChannelFileClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`ChannelFileEvents`](ChannelFileEvents.md)> & `object`

Service client for managing files within channel directories. Files are stored in directories and linked to assets in the asset system.

Access this client via `rootServer.community.channelFiles`.

## Type Declaration

### create()

> **create**(`request`: [`ChannelFileCreateRequest`](ChannelFileCreateRequest.md)): `Promise`<[`ChannelFile`](ChannelFile.md)>

Creates a new file entry in a directory. The file content must first be uploaded through the asset system to obtain an upload token.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileCreateRequest`](ChannelFileCreateRequest.md) | The file configuration including channel, directory, and upload token URI. |

#### Returns

`Promise`<[`ChannelFile`](ChannelFile.md)>

A promise that resolves to the created `ChannelFile` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, or `RequestValidationFailed` if the request is invalid.

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

> **delete**(`request`: [`ChannelFileDeleteRequest`](ChannelFileDeleteRequest.md)): `Promise`<`void`>

Deletes a file.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileDeleteRequest`](ChannelFileDeleteRequest.md) | Identifies the file to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the deletion completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the file does not exist, or `NoPermissionToDelete` if missing required permissions.

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

> **edit**(`request`: [`ChannelFileEditRequest`](ChannelFileEditRequest.md)): `Promise`<[`ChannelFileEditResponse`](ChannelFileEditResponse.md)>

Renames an existing file.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileEditRequest`](ChannelFileEditRequest.md) | Identifies the file and specifies the new name. |

#### Returns

`Promise`<[`ChannelFileEditResponse`](ChannelFileEditResponse.md)>

A promise that resolves to a `ChannelFileEditResponse` containing the updated file information.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the file does not exist, or `NoPermissionToEdit` if missing required permissions.

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

> **get**(`request`: [`ChannelFileGetRequest`](ChannelFileGetRequest.md)): `Promise`<[`ChannelFile`](ChannelFile.md)>

Retrieves a single file by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileGetRequest`](ChannelFileGetRequest.md) | Identifies the channel, directory, and file to retrieve. |

#### Returns

`Promise`<[`ChannelFile`](ChannelFile.md)>

A promise that resolves to the `ChannelFile` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the file does not exist, or `NoPermissionToRead` if missing required permissions.

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

> **list**(`request`: [`ChannelFileListRequest`](ChannelFileListRequest.md)): `Promise`<[`ChannelFile`](ChannelFile.md)[]>

Lists all files in a specific directory.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileListRequest`](ChannelFileListRequest.md) | Identifies the channel and directory to list files from. |

#### Returns

`Promise`<[`ChannelFile`](ChannelFile.md)[]>

A promise that resolves to an array of `ChannelFile` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.

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

> **move**(`request`: [`ChannelFileMoveRequest`](ChannelFileMoveRequest.md)): `Promise`<[`ChannelFileMoveResponse`](ChannelFileMoveResponse.md)>

Moves a file to a different directory.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileMoveRequest`](ChannelFileMoveRequest.md) | Identifies the file and specifies the old and new directories. |

#### Returns

`Promise`<[`ChannelFileMoveResponse`](ChannelFileMoveResponse.md)>

A promise that resolves to a `ChannelFileMoveResponse` containing the move result.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the file does not exist, or `NoPermissionToMove` if missing required permissions.

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

### search()

> **search**(`request`: [`ChannelFileSearchRequest`](ChannelFileSearchRequest.md)): `Promise`<[`ChannelFile`](ChannelFile.md)[]>

Searches for files by name within a single channel. Supports pagination using `lastFileId`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileSearchRequest`](ChannelFileSearchRequest.md) | The search criteria including channel ID and search string. |

#### Returns

`Promise`<[`ChannelFile`](ChannelFile.md)[]>

A promise that resolves to an array of matching `ChannelFile` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.

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

### searchCommunity()

> **searchCommunity**(`request`: [`ChannelFileSearchCommunityRequest`](ChannelFileSearchCommunityRequest.md)): `Promise`<[`ChannelFileSearchCommunityResponse`](ChannelFileSearchCommunityResponse.md)>

Searches for files by name across multiple channels.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelFileSearchCommunityRequest`](ChannelFileSearchCommunityRequest.md) | The search criteria including an array of channel IDs and search string. |

#### Returns

`Promise`<[`ChannelFileSearchCommunityResponse`](ChannelFileSearchCommunityResponse.md)>

A promise that resolves to a `ChannelFileSearchCommunityResponse` containing results grouped by channel.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions for any specified channel.

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