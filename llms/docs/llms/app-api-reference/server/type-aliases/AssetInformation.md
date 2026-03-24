---
path: app-api-reference/server/type-aliases/AssetInformation.md
audience: app
category: reference
summary: Object type with properties: assetId, link, linkExpiresAt, preview (Assets).
---

> **AssetInformation** = `object`

## Properties

### assetId

> **assetId**: [`AssetGuid`](AssetGuid.md)

### link

> **link**: \{ `oneofKind`: `"url"`; `url`: `string`; \} | \{ `image`: [`AssetImage`](AssetImage.md); `oneofKind`: `"image"`; \} | \{ `oneofKind`: `"video"`; `video`: [`AssetVideo`](AssetVideo.md); \} | \{ `invalid`: `AssetInvalid`; `oneofKind`: `"invalid"`; \} | \{ `file`: [`AssetFile`](AssetFile.md); `oneofKind`: `"file"`; \} | \{ `oneofKind`: `undefined`; \}

### linkExpiresAt?

> `optional` **linkExpiresAt**: `Date`

### preview?

> `optional` **preview**: [`AssetPreview`](AssetPreview.md)