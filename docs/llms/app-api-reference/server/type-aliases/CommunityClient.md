---
path: app-api-reference/server/type-aliases/CommunityClient.md
audience: app
category: reference
summary: Service client for managing community settings and properties.
---

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

#### Example

```ts
import {
  Community,
  CommunityEditRequest,
  rootServer,
} from "@rootsdk/server-app";

export async function editExample(): Promise<Community> {
  try {
    // Set up the request
    const request: CommunityEditRequest = {
      name: "MyNewCommunityName",
      pictureHex: "#FF0000",
      updatePicture: false,
      pictureTokenUri: undefined,
      defaultChannelId: undefined,
      rejectUnverifiedEmail: false,
			isAgeRestricted: false
    };

    // Call the API
    const community: Community =
      await rootServer.community.communities.edit(request);

    return community;
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
  "community": {
    "manageCommunity": true
  }
}
```

### get()

> **get**(): `Promise`<[`Community`](Community.md)>

Retrieves the current community's properties.

#### Returns

`Promise`<[`Community`](Community.md)>

A promise that resolves to the `Community` object.

#### Example

```ts
import { Community, rootServer } from "@rootsdk/server-app";

export async function getExample(): Promise<Community> {
  try {
    // Call the API
    const community: Community = await rootServer.community.communities.get();

    return community;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```