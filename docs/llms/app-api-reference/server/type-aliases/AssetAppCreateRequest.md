---
path: app-api-reference/server/type-aliases/AssetAppCreateRequest.md
audience: app
category: reference
summary: Request to convert upload tokens into permanent asset URIs.
---

> **AssetAppCreateRequest** = `object`

Request to convert upload tokens into permanent asset URIs.

## Properties

### tokens

> **tokens**: `string`[]

Array of upload token URIs to convert. Required. These tokens are obtained from your app's client code when users select files through `rootClient.asset.fileUpload()`. A token with an invalid format causes the entire request to fail.