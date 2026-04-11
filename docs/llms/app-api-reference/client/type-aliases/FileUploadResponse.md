---
path: app-api-reference/client/type-aliases/FileUploadResponse.md
audience: app
category: reference
summary: Response from `rootClient.assets.fileUpload()`. Contains temporary upload tokens that represent the files the user selected.
---

> **FileUploadResponse** = `object`

Response from `rootClient.assets.fileUpload()`. Contains temporary upload tokens that represent the files the user selected.

Pass these tokens to the server-side `AssetClient.create()` to convert them into permanent asset URIs.

## Properties

### tokens

> **tokens**: `string`[]

An array of temporary upload tokens, one per file the user selected.