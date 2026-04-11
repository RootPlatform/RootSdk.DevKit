---
path: app-api-reference/client/type-aliases/FileUploadRequest.md
audience: app
category: reference
summary: Request object for `rootClient.assets.fileUpload()`. Opens the host Root client's file picker and lets the user select files to upload.
---

> **FileUploadRequest** = `object`

Request object for `rootClient.assets.fileUpload()`. Opens the host Root client's file picker and lets the user select files to upload.

## Properties

### fileType

> **fileType**: [`FileUploadType`](FileUploadType.md)

Restricts which file types the user can select. See `FileUploadType`.

### multiple?

> `optional` **multiple**: `boolean`

Whether the user can select more than one file. Defaults to `false`. Optional.

### windowTitle?

> `optional` **windowTitle**: `string`

A custom title for the file picker dialog. Optional.