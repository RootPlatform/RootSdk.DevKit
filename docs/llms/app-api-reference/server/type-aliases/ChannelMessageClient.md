---
path: app-api-reference/server/type-aliases/ChannelMessageClient.md
audience: app
category: reference
summary: Service client for managing messages within channels. Messages are the primary content units in text channels, supporting rich content with...
---

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessage,
  ChannelMessageCreateRequest,
  rootServer,
} from "@rootsdk/server-app";

export async function createExample(
  channelId: ChannelGuid,
): Promise<ChannelMessage> {
  try {
    // Set up the request
    const request: ChannelMessageCreateRequest = {
      channelId: channelId,
      content: "Example Message",
      attachmentTokenUris: undefined,
      needsParentMessageNotification: false,
    };

    // Call the API
    const message: ChannelMessage =
      await rootServer.community.channelMessages.create(request);

    return message;
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
    "createMessage": true
  }
}
```

Depending on your usage, you may also need to declare:

- `createMessageAttachment` if message includes attachments
- `createMessageMention` if message mentions @All, @Here, or a non-mentionable role

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `createMessage` on the channel

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessage,
  ChannelMessageDeleteRequest,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function deleteExample(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMessageDeleteRequest = {
      id: messageId,
      channelId: channelId,
    };

    // Call the API
    await rootServer.community.channelMessages.delete(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Depending on your usage, you may also need to declare:

- `deleteMessageOther` if deleting messages created by others

> **Note:** No permission required to delete your own messages

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

#### Example

```ts
import {
  ChannelGuid,
  MessageGuid,
  ChannelMessage,
  ChannelMessageEditRequest,
  rootServer,
} from "@rootsdk/server-app";

export async function editExample(
  messageId: MessageGuid,
  channelId: ChannelGuid,
): Promise<ChannelMessage> {
  try {
    // Set up the request
    const request: ChannelMessageEditRequest = {
      id: messageId,
      channelId: channelId,
      content: "Edited Example Message",
      uris: undefined,
    };

    // Call the API
    const message: ChannelMessage =
      await rootServer.community.channelMessages.edit(request);

    return message;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

> **Note:** Can only edit messages created by your code; no permission required

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessageFlagRequest,
  ContentFlagReason,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function flagExample(
  channelId: ChannelGuid,
  messageId: MessageGuid,
  reason: ContentFlagReason,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMessageFlagRequest = {
      channelId: channelId,
      id: messageId,
      reason: reason,
    };

    // Call the API
    await rootServer.community.channelMessages.flag(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessage,
  ChannelMessageGetRequest,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function getExample(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<ChannelMessage> {
  try {
    // Set up the request
    const request: ChannelMessageGetRequest = {
      channelId: channelId,
      id: messageId,
    };

    // Call the API
    const message: ChannelMessage =
      await rootServer.community.channelMessages.get(request);

    return message;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  ChannelMessageListResponse,
  ChannelGuid,
  ChannelMessageListRequest,
  MessageDirectionTake,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function listExample(
  channelId: ChannelGuid,
): Promise<ChannelMessageListResponse> {
  try {
    // Set up the request
    const request: ChannelMessageListRequest = {
      channelId: channelId,
      messageDirectionTake: MessageDirectionTake.Both,
      dateAt: new Date(),
    };

    // Call the API
    const messages: ChannelMessageListResponse =
      await rootServer.community.channelMessages.list(request);

    return messages;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Depending on your usage, you may also need to declare:

- `viewMessageHistory` if listing messages sent before the code was added to the channel

> **Note:** Without ViewMessageHistory, results are limited to messages sent after the code was added to the channel

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessagePinCreateRequest,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function pinCreateExample(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMessagePinCreateRequest = {
      channelId: channelId,
      messageId: messageId,
    };

    // Call the API
    await rootServer.community.channelMessages.pinCreate(request);
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
    "managePinnedMessages": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `managePinnedMessages` on the channel

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessagePinDeleteRequest,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function pinDeleteExample(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMessagePinDeleteRequest = {
      channelId: channelId,
      messageId: messageId,
    };

    // Call the API
    await rootServer.community.channelMessages.pinDelete(request);
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
    "managePinnedMessages": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `managePinnedMessages` on the channel

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessagePinListRequest,
  ChannelMessagePinListResponse,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function pinListExample(
  channelId: ChannelGuid,
): Promise<ChannelMessagePinListResponse> {
  try {
    // Set up the request
    const request: ChannelMessagePinListRequest = {
      channelId: channelId,
    };

    // Call the API
    const pinList = await rootServer.community.channelMessages.pinList(request);

    return pinList;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessageReactionCreateRequest,
  ChannelMessageReaction,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function reactionCreateExample(
  channelId: ChannelGuid,
  messageId: MessageGuid,
  shortcode: string,
): Promise<ChannelMessageReaction> {
  try {
    // Set up the request
    const request: ChannelMessageReactionCreateRequest = {
      channelId: channelId,
      messageId: messageId,
      shortcode: shortcode,
    };

    // Call the API
    const reaction =
      await rootServer.community.channelMessages.reactionCreate(request);

    return reaction;
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
    "createMessageReaction": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `createMessageReaction` on the channel

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessageReactionDeleteRequest,
  ChannelMessageReaction,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function reactionDeleteExample(
  channelId: ChannelGuid,
  messageId: MessageGuid,
  shortcode: string,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMessageReactionDeleteRequest = {
      channelId: channelId,
      messageId: messageId,
      shortcode: shortcode,
    };

    // Call the API
    await rootServer.community.channelMessages.reactionDelete(request);
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
    "createMessageReaction": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `createMessageReaction` on the channel

> **Note:** Can only delete reactions created by your code

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessageSetTypingIndicatorRequest,
  rootServer,
} from "@rootsdk/server-app";

export async function setTypingIndicatorExample(
  channelId: ChannelGuid,
  isTyping: boolean,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMessageSetTypingIndicatorRequest = {
      channelId: channelId,
      isTyping: isTyping,
    };

    // Call the API
    await rootServer.community.channelMessages.setTypingIndicator(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  ChannelGuid,
  ChannelMessageSetViewTimeRequest,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function setViewTimeExample(
  channelId: ChannelGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: ChannelMessageSetViewTimeRequest = {
      channelId: channelId,
    };

    // Call the API
    await rootServer.community.channelMessages.setViewTime(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```