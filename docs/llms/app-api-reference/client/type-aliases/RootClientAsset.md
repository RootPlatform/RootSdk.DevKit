---
path: app-api-reference/client/type-aliases/RootClientAsset.md
audience: app
category: reference
summary: Provides methods for uploading files and converting asset URIs into displayable URLs. Available via `rootClient.assets`.
---

> **RootClientAsset** = `object`

Provides methods for uploading files and converting asset URIs into displayable URLs. Available via `rootClient.assets`.

## Methods

### fileUpload()

> **fileUpload**(`request`: [`FileUploadRequest`](FileUploadRequest.md)): `Promise`<[`FileUploadResponse`](FileUploadResponse.md)>

Opens the host Root client's file picker, uploads the selected files to the server, and returns temporary upload tokens. Pass these tokens to the server-side `AssetClient.create()` to convert them into permanent assets. The Root client displays an upload progress window while the files are being uploaded.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`FileUploadRequest`](FileUploadRequest.md) | Controls which file types are allowed, whether multiple files can be selected, and the picker dialog title. See `FileUploadRequest`. |

#### Returns

`Promise`<[`FileUploadResponse`](FileUploadResponse.md)>

A promise that resolves to a `FileUploadResponse` containing temporary upload tokens, or `null` if the user cancels the file picker or the upload fails.

### toImageUrl()

> **toImageUrl**(`uri`: `string` | `null` | `undefined`, `resolution`: [`ImageUriResolution`](../enumerations/ImageUriResolution.md)): `string`

Converts an asset URI into a displayable image URL at the specified resolution. Does not validate the URI; an invalid URI produces a URL that will fail to load.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `uri` | `string` | `null` | `undefined` | The asset URI to convert. |
| `resolution` | [`ImageUriResolution`](../enumerations/ImageUriResolution.md) | The desired image resolution. See `ImageUriResolution`. |

#### Returns

`string`

A URL string for the image at the requested resolution. Returns an empty string if the URI is null or undefined.

### toUploadImagePreview()

> **toUploadImagePreview**(`token`: `string`): `string` | `undefined`

Converts a temporary upload token into a preview URL for an image that has not yet been permanently stored. Use this to display a preview of an image the user just selected, before calling `AssetClient.create()` on the server.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `token` | `string` | A temporary upload token from `FileUploadResponse`. |

#### Returns

`string` | `undefined`

A preview URL string, or `undefined` if the token is not found or is empty.

### toUrl()

> **toUrl**(`uri`: `string` | `null` | `undefined`): `string`

Converts an asset URI into a displayable URL. Does not validate the URI; an invalid URI produces a URL that will fail to load.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `uri` | `string` | `null` | `undefined` | The asset URI to convert. |

#### Returns

`string`

A URL string that can be used in `src` attributes or fetch calls. Returns an empty string if the URI is null or undefined.