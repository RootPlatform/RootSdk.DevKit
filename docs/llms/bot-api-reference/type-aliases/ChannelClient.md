---
path: bot-api-reference/type-aliases/ChannelClient.md
audience: bot
category: reference
summary: Service client for managing channels within a community. Channels are the primary containers for content within channel groups, supporting different...
---

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

#### Example

```ts
import {
  Channel,
  ChannelCreateRequest,
  ChannelGroupGuid,
  ChannelType,
  rootServer,
} from "@rootsdk/server-bot";

export async function createExample(
  channelGroupId: ChannelGroupGuid,
): Promise<Channel> {
  try {
    // Set up the request
    const request: ChannelCreateRequest = {
      channelGroupId: channelGroupId,
      channelType: ChannelType.Text,
      iconTokenUri: undefined,
      name: "MyChannelName",
      description: "My Channel Description",
      useChannelGroupPermission: true,
    };

    // Call the API
    const channel: Channel =
      await rootServer.community.channels.create(request);

    return channel;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  Channel,
  ChannelDeleteRequest,
  ChannelGuid,
  ChannelGroupGuid,
  ChannelType,
  rootServer,
} from "@rootsdk/server-bot";

export async function deleteExample(
  channelGroupId: ChannelGroupGuid,
  channelId: ChannelGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelDeleteRequest = {
      id: channelId,
    };

    // Call the API
    await rootServer.community.channels.delete(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  Channel,
  ChannelEditRequest,
  ChannelGuid,
  ChannelGroupGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function editExample(channelId: ChannelGuid): Promise<void> {
  try {
    // Set up the request
    const request: ChannelEditRequest = {
      id: channelId,
      updateIcon: false,
      iconTokenUri: undefined,
      name: "MyNewChannelName",
      description: "My New Channel Description",
      useChannelGroupPermission: true,
    };

    // Call the API
    await rootServer.community.channels.edit(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  Channel,
  ChannelGetRequest,
  ChannelGuid,
  ChannelGroupGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function getExample(channelId: ChannelGuid): Promise<Channel> {
  try {
    // Set up the request
    const request: ChannelGetRequest = {
      id: channelId,
    };

    // Call the API
    const channel: Channel = await rootServer.community.channels.get(request);

    return channel;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  Channel,
  ChannelGroupGuid,
  ChannelGuid,
  ChannelListRequest,
  rootServer,
} from "@rootsdk/server-bot";

export async function listExample(
  channelGroupId: ChannelGroupGuid,
): Promise<Channel[]> {
  try {
    // Set up the request
    const request: ChannelListRequest = {
      channelGroupId: channelGroupId,
    };

    // Call the API
    const channels: Channel[] =
      await rootServer.community.channels.list(request);

    return channels;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  Channel,
  ChannelMoveRequest,
  ChannelGuid,
  ChannelGroupGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function moveExample(
  channelId: ChannelGuid,
  oldChannelGroupId: ChannelGroupGuid,
  newChannelGroupId: ChannelGroupGuid,
  beforeChannelId?: ChannelGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMoveRequest = {
      id: channelId,
      oldChannelGroupId: oldChannelGroupId,
      newChannelGroupId: newChannelGroupId,
      beforeChannelId: beforeChannelId,
    };

    // Call the API
    await rootServer.community.channels.move(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```