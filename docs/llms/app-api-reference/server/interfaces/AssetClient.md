---
path: app-api-reference/server/interfaces/AssetClient.md
audience: app
category: reference
summary: Client for converting temporary upload tokens into permanent asset URIs.
---

> **Worked sample**: `api-samples/server-app-assets/` — Server Assets

Client for converting temporary upload tokens into permanent asset URIs. Use this to persist files that your app's client has uploaded so they can be referenced later.

This client is only available to apps. Bots cannot create assets.

Access this client via `rootServer.dataStore.assets`.

## Methods

### create()

> **create**(`request`: [`AssetAppCreateRequest`](../type-aliases/AssetAppCreateRequest.md)): `Promise`<[`AssetAppCreateResponse`](../type-aliases/AssetAppCreateResponse.md)>

Converts one or more upload tokens into permanent asset URIs. Upload tokens come from your app's client code when users select files through the file picker. Once converted, the resulting asset URIs can be stored and used indefinitely.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AssetAppCreateRequest`](../type-aliases/AssetAppCreateRequest.md) | The upload tokens to convert. |

#### Returns

`Promise`<[`AssetAppCreateResponse`](../type-aliases/AssetAppCreateResponse.md)>

A promise that resolves to an `AssetAppCreateResponse` containing a map of tokens to their permanent asset URIs.

#### Throws

`RootApiException` with `errorCode` set to `ErrorCodeType.UnAuthenticated` if called by a bot instead of an app.

#### Throws

`RootApiException` with `errorCode` set to `ErrorCodeType.NoPermissionToRead` if the app is not a member of the community.

### get()

> **get**(`request`: [`AssetGetRequest`](../type-aliases/AssetGetRequest.md)): `Promise`<[`AssetGetResponse`](../type-aliases/AssetGetResponse.md)>

Retrieves metadata for one or more assets by their URIs. Returns information such as the download link, expiry, and preview data for each asset.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AssetGetRequest`](../type-aliases/AssetGetRequest.md) | The asset URIs to look up. |

#### Returns

`Promise`<[`AssetGetResponse`](../type-aliases/AssetGetResponse.md)>

A promise that resolves to an `AssetGetResponse` containing a map of URIs to their `AssetInformation`. URIs that do not match a known asset are omitted from the response map. If none of the URIs match, the map is empty.