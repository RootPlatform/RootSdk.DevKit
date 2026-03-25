---
path: app-api-reference/server/interfaces/AssetClient.md
audience: app
category: reference
summary: Client for converting temporary upload tokens into permanent asset URIs.
---

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

#### Example

```ts
import {
  AssetAppCreateRequest,
  AssetAppCreateResponse,
  rootServer,
} from "@rootsdk/server-app";

export async function createExample(
  tokens: string[],
): Promise<AssetAppCreateResponse> {
  try {
    // Set up the request
    const request: AssetAppCreateRequest = {
      tokens: tokens,
    };

    // Call the API
    const result: AssetAppCreateResponse =
      await rootServer.dataStore.assets.create(request);

    return result;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### get()

> **get**(`request`: `AssetGetRequest`): `Promise`<`AssetGetResponse`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | `AssetGetRequest` |

#### Returns

`Promise`<`AssetGetResponse`>