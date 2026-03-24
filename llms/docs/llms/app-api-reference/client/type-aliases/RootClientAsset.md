---
path: app-api-reference/client/type-aliases/RootClientAsset.md
audience: app
category: reference
summary: Type alias for `object` (Root Core).
---

> **RootClientAsset** = `object`

## Methods

### fileUpload()

> **fileUpload**(`request`: [`FileUploadRequest`](FileUploadRequest.md)): `Promise`<[`FileUploadResponse`](FileUploadResponse.md)>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`FileUploadRequest`](FileUploadRequest.md) |

#### Returns

`Promise`<[`FileUploadResponse`](FileUploadResponse.md)>

### toImageUrl()

> **toImageUrl**(`uri`: `string` | `null` | `undefined`, `resolution`: [`ImageUriResolution`](ImageUriResolution.md)): `string`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `uri` | `string` | `null` | `undefined` |
| `resolution` | [`ImageUriResolution`](ImageUriResolution.md) |

#### Returns

`string`

### toUploadImagePreview()

> **toUploadImagePreview**(`token`: `string`): `string` | `undefined`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | `string` |

#### Returns

`string` | `undefined`

### toUrl()

> **toUrl**(`uri`: `string` | `null` | `undefined`): `string`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `uri` | `string` | `null` | `undefined` |

#### Returns

`string`