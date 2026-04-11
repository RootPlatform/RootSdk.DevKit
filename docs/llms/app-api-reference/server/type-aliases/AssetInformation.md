---
path: app-api-reference/server/type-aliases/AssetInformation.md
audience: app
category: reference
summary: Metadata for a single asset. Returned by `AssetClient.get()` and included in message events via `MessageReferenceMaps`.
---

> **AssetInformation** = `object`

Metadata for a single asset. Returned by `AssetClient.get()` and included in message events via `MessageReferenceMaps`. Contains the asset's download link, ID, and optional preview data.

## Properties

### assetId

> **assetId**: [`AssetGuid`](AssetGuid.md)

The unique identifier of the asset.

### link

> **link**: \{ `oneofKind`: `"url"`; `url`: `string`; \} | \{ `image`: [`AssetImage`](AssetImage.md); `oneofKind`: `"image"`; \} | \{ `oneofKind`: `"video"`; `video`: [`AssetVideo`](AssetVideo.md); \} | \{ `invalid`: `AssetInvalid`; `oneofKind`: `"invalid"`; \} | \{ `file`: [`AssetFile`](AssetFile.md); `oneofKind`: `"file"`; \} | \{ `oneofKind`: `undefined`; \}

A discriminated union describing the asset content. Check `oneofKind` to determine the type:

- `"url"` — A direct download URL (string).
- `"image"` — An `AssetImage` with resolution variants and thumbnail.
- `"video"` — An `AssetVideo` with streaming and download URLs.
- `"file"` — An `AssetFile` with download URL, MIME type, and size.
- `"invalid"` — The asset failed processing. See `AssetInvalid` for the reason.
- `undefined` — No link data is available.

### linkExpiresAt?

> `optional` **linkExpiresAt**: `Date`

When the download links expire. Optional. After this time, call `AssetClient.get()` again to obtain fresh URLs.

### preview?

> `optional` **preview**: [`AssetPreview`](AssetPreview.md)

Optional preview metadata for the asset. See `AssetPreview`.