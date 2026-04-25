---
path: bot-api-reference/type-aliases/ChannelMessageClient.md
audience: bot
category: reference
summary: Service client for managing messages within channels. Messages are the primary content units in text channels, supporting rich content with...
---

> **Worked sample**: `api-samples/server-messages/` — Channel Messages

> **ChannelMessageClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`ChannelMessageEvents`](ChannelMessageEvents.md)> & `object`

Service client for managing messages within channels. Messages are the primary content units in text channels, supporting rich content with responses, attachments, reactions, and pins.

The client provides methods for creating, retrieving, editing, and deleting messages, as well as managing message reactions and pins. It also supports typing indicators and view time tracking for real-time presence features.

Access this client via `rootServer.community.channelMessages`.

## Type Declaration

### create()

> **create**(`request`: [`ChannelMessageCreateRequest`](ChannelMessageCreateRequest.md)): `Promise`<[`ChannelMessage`](ChannelMessage.md)>

Creates a new message in a channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageCreateRequest`](ChannelMessageCreateRequest.md) | The message configuration including content and optional attachments. |

#### Returns

`Promise`<[`ChannelMessage`](ChannelMessage.md)>

A promise that resolves to the created `ChannelMessage` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, `NotFound` if the channel does not exist, or `RequestValidationFailed` if the request is invalid.

### delete()

> **delete**(`request`: [`ChannelMessageDeleteRequest`](ChannelMessageDeleteRequest.md)): `Promise`<`void`>

Deletes a message from a channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageDeleteRequest`](ChannelMessageDeleteRequest.md) | Identifies the channel and message to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the delete operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message does not exist, or `NoPermissionToDelete` if missing required permissions.

### edit()

> **edit**(`request`: [`ChannelMessageEditRequest`](ChannelMessageEditRequest.md)): `Promise`<[`ChannelMessage`](ChannelMessage.md)>

Edits an existing message's content.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageEditRequest`](ChannelMessageEditRequest.md) | Identifies the message and provides the updated content. |

#### Returns

`Promise`<[`ChannelMessage`](ChannelMessage.md)>

A promise that resolves to the updated `ChannelMessage` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message does not exist, or `NoPermissionToEdit` if missing required permissions.

### flag()

> **flag**(`request`: [`ChannelMessageFlagRequest`](ChannelMessageFlagRequest.md)): `Promise`<`void`>

Reports a message for moderation review.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageFlagRequest`](ChannelMessageFlagRequest.md) | Identifies the message and the reason for flagging. |

#### Returns

`Promise`<`void`>

A promise that resolves when the flag operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message does not exist.

### get()

> **get**(`request`: [`ChannelMessageGetRequest`](ChannelMessageGetRequest.md)): `Promise`<[`ChannelMessage`](ChannelMessage.md)>

Retrieves a single message by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageGetRequest`](ChannelMessageGetRequest.md) | Identifies the channel and message to retrieve. |

#### Returns

`Promise`<[`ChannelMessage`](ChannelMessage.md)>

A promise that resolves to the `ChannelMessage` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message does not exist, or `NoPermissionToRead` if missing required permissions.

### list()

> **list**(`request`: [`ChannelMessageListRequest`](ChannelMessageListRequest.md)): `Promise`<[`ChannelMessageListResponse`](ChannelMessageListResponse.md)>

Lists messages in a channel with pagination support. Messages can be retrieved relative to a specific timestamp, fetching newer messages, older messages, or both directions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageListRequest`](ChannelMessageListRequest.md) | Specifies the channel, pagination direction, and reference timestamp. |

#### Returns

`Promise`<[`ChannelMessageListResponse`](ChannelMessageListResponse.md)>

A promise that resolves to a `ChannelMessageListResponse` containing messages and pagination information.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel does not exist, or `NoPermissionToRead` if missing required permissions.

### pinCreate()

> **pinCreate**(`request`: [`ChannelMessagePinCreateRequest`](ChannelMessagePinCreateRequest.md)): `Promise`<`void`>

Pins a message to the channel for easy access.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessagePinCreateRequest`](ChannelMessagePinCreateRequest.md) | Identifies the channel and message to pin. |

#### Returns

`Promise`<`void`>

A promise that resolves when the pin operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message does not exist, or `NoPermissionToEdit` if missing required permissions.

### pinDelete()

> **pinDelete**(`request`: [`ChannelMessagePinDeleteRequest`](ChannelMessagePinDeleteRequest.md)): `Promise`<`void`>

Removes a pin from a message.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessagePinDeleteRequest`](ChannelMessagePinDeleteRequest.md) | Identifies the channel and message to unpin. |

#### Returns

`Promise`<`void`>

A promise that resolves when the unpin operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message or pin does not exist, or `NoPermissionToEdit` if missing required permissions.

### pinList()

> **pinList**(`request`: [`ChannelMessagePinListRequest`](ChannelMessagePinListRequest.md)): `Promise`<[`ChannelMessagePinListResponse`](ChannelMessagePinListResponse.md)>

Lists all pinned messages in a channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessagePinListRequest`](ChannelMessagePinListRequest.md) | Identifies the channel to list pinned messages from. |

#### Returns

`Promise`<[`ChannelMessagePinListResponse`](ChannelMessagePinListResponse.md)>

A promise that resolves to a `ChannelMessagePinListResponse` containing pinned messages.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel does not exist, or `NoPermissionToRead` if missing required permissions.

### reactionCreate()

> **reactionCreate**(`request`: [`ChannelMessageReactionCreateRequest`](ChannelMessageReactionCreateRequest.md)): `Promise`<[`ChannelMessageReaction`](ChannelMessageReaction.md)>

Adds a reaction to a message.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageReactionCreateRequest`](ChannelMessageReactionCreateRequest.md) | Identifies the message and the reaction shortcode to add. |

#### Returns

`Promise`<[`ChannelMessageReaction`](ChannelMessageReaction.md)>

A promise that resolves to the created `ChannelMessageReaction` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message does not exist, or `AlreadyExists` if the user has already added this reaction.

### reactionDelete()

> **reactionDelete**(`request`: [`ChannelMessageReactionDeleteRequest`](ChannelMessageReactionDeleteRequest.md)): `Promise`<`void`>

Removes a reaction from a message.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageReactionDeleteRequest`](ChannelMessageReactionDeleteRequest.md) | Identifies the message and the reaction shortcode to remove. |

#### Returns

`Promise`<`void`>

A promise that resolves when the reaction is removed.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message or reaction does not exist.

### reactionDeleteFull()

> **reactionDeleteFull**(`request`: [`ChannelMessageReactionDeleteFullRequest`](ChannelMessageReactionDeleteFullRequest.md)): `Promise`<`void`>

Removes all reactions with a given shortcode from a message, regardless of which users added them.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageReactionDeleteFullRequest`](ChannelMessageReactionDeleteFullRequest.md) | Identifies the message and the reaction shortcode to remove. |

#### Returns

`Promise`<`void`>

A promise that resolves when the reactions are removed.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the message does not exist.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToDelete` if the caller lacks permission.

### setTypingIndicator()

> **setTypingIndicator**(`request`: [`ChannelMessageSetTypingIndicatorRequest`](ChannelMessageSetTypingIndicatorRequest.md)): `Promise`<`void`>

Updates the typing indicator status for the current user in a channel.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageSetTypingIndicatorRequest`](ChannelMessageSetTypingIndicatorRequest.md) | Identifies the channel and the typing state. |

#### Returns

`Promise`<`void`>

A promise that resolves when the typing indicator is updated.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel does not exist, or `NoPermissionToType` if missing required permissions.

### setViewTime()

> **setViewTime**(`request`: [`ChannelMessageSetViewTimeRequest`](ChannelMessageSetViewTimeRequest.md)): `Promise`<`void`>

Updates the last viewed timestamp for the current user in a channel. This is used for tracking read status and unread message counts.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`ChannelMessageSetViewTimeRequest`](ChannelMessageSetViewTimeRequest.md) | Identifies the channel to mark as viewed. |

#### Returns

`Promise`<`void`>

A promise that resolves when the view time is updated.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the channel does not exist.

