---
path: bot-api-reference/type-aliases/ChannelClient.md
audience: bot
category: reference
summary: Service client for managing channels within a community. Channels are the primary containers for content within channel groups, supporting different...
---

> **Worked sample**: `api-samples/server-channels/` — Channels

> **ChannelClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`ChannelEvents`](ChannelEvents.md)> & `object`

Service client for managing channels within a community. Channels are the primary containers for content within channel groups, supporting different types such as text, threaded text, voice, and app channels.

Channels belong to channel groups and can have their own permission configurations or inherit permissions from their parent channel group. The client provides methods for creating, retrieving, editing, moving, and deleting channels, as well as events for real-time channel updates.

Access this client via `rootServer.community.channels`.

## Type Declaration

### create()

> **create**(`request`: [`ChannelCreateRequest`](ChannelCreateRequest.md)): `Promise`<[`Channel`](Channel.md)>

Creates a new channel within a channel group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelCreateRequest`](ChannelCreateRequest.md) | The channel configuration. |

#### Returns

`Promise`<[`Channel`](Channel.md)>

A promise that resolves to the created `Channel` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, `NotFound` if the channel group does not exist, or `RequestValidationFailed` if the request is invalid.

### delete()

> **delete**(`request`: [`ChannelDeleteRequest`](ChannelDeleteRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

Deletes a channel from its channel group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelDeleteRequest`](ChannelDeleteRequest.md) | Identifies the channel to delete. |
| `eventHandlers?` | \{ `channel.deleted`: [`ChannelDeletedHandler`](ChannelDeletedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); \} | Optional handlers for permission update events. Supported event keys: `channel.deleted`, `channelGroup.deleted`. |
| `eventHandlers.channel.deleted?` | [`ChannelDeletedHandler`](ChannelDeletedHandler.md) | - |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) | - |

#### Returns

`Promise`<`void`>

A promise that resolves when the delete operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel does not exist, or `NoPermissionToDelete` if missing required permissions.

### edit()

> **edit**(`request`: [`ChannelEditRequest`](ChannelEditRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

Edits an existing channel's properties. This can include changing the name, description, icon, or permission settings.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelEditRequest`](ChannelEditRequest.md) | Identifies the channel and the updates to apply. |
| `eventHandlers?` | \{ `channel.deleted`: [`ChannelDeletedHandler`](ChannelDeletedHandler.md); `channel.edited`: [`ChannelEditedHandler`](ChannelEditedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); \} | Optional handlers for permission update events. Supported event keys: `channel.edited`, `channel.deleted`, `channelGroup.deleted`. |
| `eventHandlers.channel.deleted?` | [`ChannelDeletedHandler`](ChannelDeletedHandler.md) | - |
| `eventHandlers.channel.edited?` | [`ChannelEditedHandler`](ChannelEditedHandler.md) | - |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) | - |

#### Returns

`Promise`<`void`>

A promise that resolves when the edit operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel does not exist, or `NoPermissionToEdit` if missing required permissions.

### get()

> **get**(`request`: [`ChannelGetRequest`](ChannelGetRequest.md)): `Promise`<[`Channel`](Channel.md)>

Retrieves a single channel by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelGetRequest`](ChannelGetRequest.md) | Identifies the channel to retrieve. |

#### Returns

`Promise`<[`Channel`](Channel.md)>

A promise that resolves to the `Channel` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel does not exist, or `NoPermissionToRead` if missing required permissions.

### list()

> **list**(`request`: [`ChannelListRequest`](ChannelListRequest.md)): `Promise`<[`Channel`](Channel.md)[]>

Lists all channels within a channel group, sorted by position.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelListRequest`](ChannelListRequest.md) | Identifies the channel group to list. |

#### Returns

`Promise`<[`Channel`](Channel.md)[]>

A promise that resolves to an array of `Channel` objects, sorted by their position within the group.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel group does not exist, or `NoPermissionToRead` if missing required permissions.

### move()

> **move**(`request`: [`ChannelMoveRequest`](ChannelMoveRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

Moves a channel to a different position or channel group. This operation may trigger permission update events if the channel's permissions change as a result of the move.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMoveRequest`](ChannelMoveRequest.md) | Identifies the channel and its destination. |
| `eventHandlers?` | \{ `channel.edited`: [`ChannelEditedHandler`](ChannelEditedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); \} | Optional handlers for permission update events. Supported event keys: `channel.edited`, `channelGroup.deleted`. |
| `eventHandlers.channel.edited?` | [`ChannelEditedHandler`](ChannelEditedHandler.md) | - |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) | - |

#### Returns

`Promise`<`void`>

A promise that resolves when the move operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel or target channel group does not exist, or `NoPermissionToMove` if missing required permissions.

