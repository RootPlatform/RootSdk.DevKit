---
path: bot-api-reference/type-aliases/CommunityEmojiClient.md
audience: bot
category: reference
summary: Service client for managing custom emojis within a community. Community emojis are custom images associated with shortcodes that members can use in...
---

> **Worked sample**: `api-samples/server-emojis/` — Community Emojis

> **CommunityEmojiClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`CommunityEmojiEvents`](CommunityEmojiEvents.md)> & `object`

Service client for managing custom emojis within a community. Community emojis are custom images associated with shortcodes that members can use in messages.

The client provides methods for retrieving and deleting community emojis, as well as events for real-time emoji updates. Emoji creation is managed through the community settings interface; this client provides read and delete access for apps and bots.

Access this client via `rootServer.community.communityEmojis`.

## Type Declaration

### delete()

> **delete**(`request`: [`CommunityEmojiDeleteRequest`](CommunityEmojiDeleteRequest.md)): `Promise`<`void`>

Deletes a community emoji from the community.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityEmojiDeleteRequest`](CommunityEmojiDeleteRequest.md) | Identifies the emoji to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the delete operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToDelete` if missing required permissions, or `NotFound` if the emoji does not exist.

### get()

> **get**(`request`: [`CommunityEmojiGetRequest`](CommunityEmojiGetRequest.md)): `Promise`<[`CommunityEmoji`](CommunityEmoji.md)>

Retrieves a single community emoji by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityEmojiGetRequest`](CommunityEmojiGetRequest.md) | Identifies the emoji to retrieve. |

#### Returns

`Promise`<[`CommunityEmoji`](CommunityEmoji.md)>

A promise that resolves to the `CommunityEmoji` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions, or `NotFound` if the emoji does not exist.

### list()

> **list**(): `Promise`<[`CommunityEmoji`](CommunityEmoji.md)[]>

Lists all community emojis in the current community.

#### Returns

`Promise`<[`CommunityEmoji`](CommunityEmoji.md)[]>

A promise that resolves to an array of `CommunityEmoji` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.