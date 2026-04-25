---
path: bot-api-reference/type-aliases/CommunityClient.md
audience: bot
category: reference
summary: Service client for managing community settings and properties.
---

> **Worked sample**: `api-samples/server-community/` — Community

> **CommunityClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`CommunityEvents`](CommunityEvents.md)> & `object`

Service client for managing community settings and properties. A community is the top-level container that holds all channels, channel groups, members, and roles.

The client provides methods for retrieving and editing community properties such as name, picture, and membership settings. It also emits events when the community is modified or when members join or leave.

Access this client via `rootServer.community.communities`.

## Type Declaration

### edit()

> **edit**(`request`: [`CommunityEditRequest`](CommunityEditRequest.md)): `Promise`<[`Community`](Community.md)>

Edits the current community's properties. This can include changing the name, picture, default channel, email verification requirements, and join throttling settings. The edit method uses full-replace semantics, not patch semantics. Every call replaces the entire community object. Optional fields (`defaultChannelId`, `joinThrottle`) that are omitted from the request will be cleared to null, not preserved at their current values. To avoid accidentally clearing fields you didn't intend to change, always read the current community with `get` first and include the existing values in your edit request.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityEditRequest`](CommunityEditRequest.md) | The community updates to apply. |

#### Returns

`Promise`<[`Community`](Community.md)>

A promise that resolves to the updated `Community` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToEdit` if missing required permissions, or `RequestValidationFailed` if the request is invalid.

### get()

> **get**(): `Promise`<[`Community`](Community.md)>

Retrieves the current community's properties.

#### Returns

`Promise`<[`Community`](Community.md)>

A promise that resolves to the `Community` object.

