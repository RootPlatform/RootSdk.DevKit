---
path: app-api-reference/server/type-aliases/AttachedClients.md
audience: app
category: reference
summary: Query and subscribe to client attachment state for your app.
---

> **Worked sample**: `api-samples/server-app-client-attachment/` — Client Attachment

> **AttachedClients** = `object` & [`TypedEventEmitter`](TypedEventEmitter.md)<[`ClientEvents`](ClientEvents.md)>

Query and subscribe to client attachment state for your app.

## Type Declaration

### getClient()

> **getClient**(`userId`: [`UserGuid`](UserGuid.md), `communityId?`: [`CommunityGuid`](CommunityGuid.md)): [`Client`](Client.md) | `undefined`

Get a specific attached member by user ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userId` | [`UserGuid`](UserGuid.md) | The user's GUID. |
| `communityId?` | [`CommunityGuid`](CommunityGuid.md) | - |

#### Returns

[`Client`](Client.md) | `undefined`

The `Client` object if the member has your app open, or `undefined` if not. The `Client.deviceId` property is `undefined` on the returned object; use `Client.deviceIds` to get the member's connected devices.

### getClients()

> **getClients**(`communityId?`: [`CommunityGuid`](CommunityGuid.md)): [`Client`](Client.md)[]

Get all members who currently have your app's channel open.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `communityId?` | [`CommunityGuid`](CommunityGuid.md) |

#### Returns

[`Client`](Client.md)[]

Array of `Client` objects representing attached members. The `Client.deviceId` property is `undefined` on these objects; use `Client.deviceIds` to get the member's connected devices.

### getDeviceIds()

> **getDeviceIds**(`communityId?`: [`CommunityGuid`](CommunityGuid.md)): `string`[]

Get all device IDs for members who currently have your app open.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `communityId?` | [`CommunityGuid`](CommunityGuid.md) |

#### Returns

`string`[]

Array of device ID strings.