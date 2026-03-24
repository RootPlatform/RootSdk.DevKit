---
path: app-api-reference/server/type-aliases/AssetPreview.md
audience: app
category: reference
summary: Object type with properties: description, details, previews, title, ... (Assets).
---

> **AssetPreview** = `object`

## Properties

### description

> **description**: `string`

### details

> **details**: \{ `audio`: [`AssetPreviewAudio`](AssetPreviewAudio.md); `oneofKind`: `"audio"`; \} | \{ `oneofKind`: `"video"`; `video`: [`AssetPreviewVideo`](AssetPreviewVideo.md); \} | \{ `oneofKind`: `"webpage"`; `webpage`: [`AssetPreviewWebpage`](AssetPreviewWebpage.md); \} | \{ `oneofKind`: `undefined`; \}

### previews?

> `optional` **previews**: [`AssetPreviewImage`](AssetPreviewImage.md)[]

### title

> **title**: `string`

### type

> **type**: `AssetPreviewType`

### updatedAt?

> `optional` **updatedAt**: `Date`