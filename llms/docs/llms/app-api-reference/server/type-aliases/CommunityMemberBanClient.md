---
path: app-api-reference/server/type-aliases/CommunityMemberBanClient.md
audience: app
category: reference
summary: Service client for managing member bans and kicks within a community.
---

> **CommunityMemberBanClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`CommunityMemberBanEvents`](CommunityMemberBanEvents.md)> & `object`

Service client for managing member bans and kicks within a community. Bans prevent users from rejoining the community, while kicks remove users without preventing them from rejoining.

Banning or kicking a member removes them from the community, sends them a notification, posts a system message to the community's default channel, and creates a community log entry. Apps cannot be banned or kicked.

Access this client via `rootServer.community.communityMemberBans`.

## Type Declaration

### create()

> **create**(`request`: [`CommunityMemberBanCreateRequest`](CommunityMemberBanCreateRequest.md)): `Promise`<[`CommunityMemberBan`](CommunityMemberBan.md)>

Bans a single member from the community. The member is removed from the community and cannot rejoin until the ban is deleted.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberBanCreateRequest`](CommunityMemberBanCreateRequest.md) | Identifies the member to ban and optional ban details. |

#### Returns

`Promise`<[`CommunityMemberBan`](CommunityMemberBan.md)>

A promise that resolves to the created `CommunityMemberBan` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToBan` if missing required permissions or attempting to ban the community owner, `NotFound` if the member does not exist, or `NoPermissionToKick` if attempting to ban an app.

#### Example

```ts
import {
  CommunityMemberBan,
  CommunityMemberBanCreateRequest,
  UserGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function createExample(
  userId: UserGuid,
): Promise<CommunityMemberBan> {
  try {
    // Set up the request
    const request: CommunityMemberBanCreateRequest = {
      userId: userId,
      reason: "Why the user should be banned from the community",
      expiresAt: undefined,
    };

    // Call the API
    const communityMemberBan: CommunityMemberBan =
      await rootServer.community.communityMemberBans.create(request);

    return communityMemberBan;
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
    "createBan": true
  }
}
```

### createBulk()

> **createBulk**(`request`: [`CommunityMemberBanCreateBulkRequest`](CommunityMemberBanCreateBulkRequest.md)): `Promise`<[`CommunityMemberBanBulk`](CommunityMemberBanBulk.md)>

Bans multiple members from the community in a single operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberBanCreateBulkRequest`](CommunityMemberBanCreateBulkRequest.md) | Identifies the members to ban and optional ban details. |

#### Returns

`Promise`<[`CommunityMemberBanBulk`](CommunityMemberBanBulk.md)>

A promise that resolves to a `CommunityMemberBanBulk` object containing the IDs of successfully banned users.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToBan` if missing required permissions or attempting to ban the community owner, `NotFound` if none of the specified members exist, or `NoPermissionToKick` if attempting to ban an app.

### delete()

> **delete**(`request`: [`CommunityMemberBanDeleteRequest`](CommunityMemberBanDeleteRequest.md)): `Promise`<`void`>

Removes a ban, allowing the user to rejoin the community. This does not automatically add the user back to the community.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberBanDeleteRequest`](CommunityMemberBanDeleteRequest.md) | Identifies the ban to delete by user ID. |

#### Returns

`Promise`<`void`>

A promise that resolves when the ban is deleted.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToBan` if missing required permissions, or `NotFound` if the ban does not exist.

#### Example

```ts
import {
  CommunityMemberBan,
  CommunityMemberBanDeleteRequest,
  UserGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function deleteExample(userId: UserGuid): Promise<void> {
  try {
    // Set up the request
    const request: CommunityMemberBanDeleteRequest = {
      userId: userId,
    };

    // Call the API
    await rootServer.community.communityMemberBans.delete(request);
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
    "manageBans": true
  }
}
```

### get()

> **get**(`request`: [`CommunityMemberBanGetRequest`](CommunityMemberBanGetRequest.md)): `Promise`<[`CommunityMemberBan`](CommunityMemberBan.md)>

Retrieves a specific ban by user ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberBanGetRequest`](CommunityMemberBanGetRequest.md) | Identifies the ban to retrieve. |

#### Returns

`Promise`<[`CommunityMemberBan`](CommunityMemberBan.md)>

A promise that resolves to the `CommunityMemberBan` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToBan` if missing required permissions, or `NotFound` if the ban does not exist.

#### Example

```ts
import {
  CommunityMemberBan,
  CommunityMemberBanGetRequest,
  UserGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function getExample(
  userId: UserGuid,
): Promise<CommunityMemberBan> {
  try {
    // Set up the request
    const request: CommunityMemberBanGetRequest = {
      userId: userId,
    };

    // Call the API
    const communityMemberBan =
      await rootServer.community.communityMemberBans.get(request);

    return communityMemberBan;
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
    "manageBans": true
  }
}
```

### kick()

> **kick**(`request`: [`CommunityMemberBanKickRequest`](CommunityMemberBanKickRequest.md)): `Promise`<`void`>

Kicks a single member from the community. The member is removed but can rejoin if they have an invite or the community is public.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberBanKickRequest`](CommunityMemberBanKickRequest.md) | Identifies the member to kick. |

#### Returns

`Promise`<`void`>

A promise that resolves when the member is kicked.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToKick` if missing required permissions or attempting to kick an app, `NoPermissionToBan` if attempting to kick the community owner, or `NotFound` if the member does not exist.

#### Example

```ts
import {
  CommunityMemberBan,
  CommunityMemberBanKickRequest,
  UserGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function kickExample(userId: UserGuid): Promise<void> {
  try {
    // Set up the request
    const request: CommunityMemberBanKickRequest = {
      userId: userId,
    };

    // Call the API
    await rootServer.community.communityMemberBans.kick(request);
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
    "kick": true
  }
}
```

### kickBulk()

> **kickBulk**(`request`: [`CommunityMemberBanKickBulkRequest`](CommunityMemberBanKickBulkRequest.md)): `Promise`<[`CommunityMemberBanKickBulkResponse`](CommunityMemberBanKickBulkResponse.md)>

Kicks multiple members from the community in a single operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberBanKickBulkRequest`](CommunityMemberBanKickBulkRequest.md) | Identifies the members to kick. |

#### Returns

`Promise`<[`CommunityMemberBanKickBulkResponse`](CommunityMemberBanKickBulkResponse.md)>

A promise that resolves to a `CommunityMemberBanKickBulkResponse` object containing the IDs of successfully kicked users.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToKick` if missing required permissions or attempting to kick an app, `NoPermissionToBan` if attempting to kick the community owner, or `NotFound` if none of the specified members exist.

### list()

> **list**(): `Promise`<[`CommunityMemberBan`](CommunityMemberBan.md)[]>

Lists all active bans in the community.

#### Returns

`Promise`<[`CommunityMemberBan`](CommunityMemberBan.md)[]>

A promise that resolves to an array of `CommunityMemberBan` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToBan` if missing required permissions.

#### Example

```ts
import { CommunityMemberBan, rootServer } from "@rootsdk/server-app";

export async function listExample(): Promise<CommunityMemberBan[]> {
  try {
    // Call the API
    const communityMemberBans: CommunityMemberBan[] =
      await rootServer.community.communityMemberBans.list();

    return communityMemberBans;
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
    "manageBans": true
  }
}
```