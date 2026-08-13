---
path: app-api-reference/server/type-aliases/AssetPreview.md
audience: app
category: reference
summary: Link preview metadata for an asset. Generated automatically by the platform when a URL or media file is processed.
---

> **AssetPreview** = `object`

Link preview metadata for an asset. Generated automatically by the platform when a URL or media file is processed. Contains a title, description, thumbnail images, and type-specific details.

## Properties

### description

> **description**: `string`

The preview description (e.g., the meta description for a webpage).

### details

> **details**: \{ `audio`: [`AssetPreviewAudio`](AssetPreviewAudio.md); `oneofKind`: `"audio"`; \} | \{ `oneofKind`: `"video"`; `video`: [`AssetPreviewVideo`](AssetPreviewVideo.md); \} | \{ `oneofKind`: `"webpage"`; `webpage`: [`AssetPreviewWebpage`](AssetPreviewWebpage.md); \} | \{ `oneofKind`: `undefined`; \}

A discriminated union with type-specific preview metadata. Check `oneofKind` to determine the type:

- `"audio"`: An `AssetPreviewAudio` with codec, bitrate, and duration.
- `"video"`: An `AssetPreviewVideo` with dimensions, codec, bitrate, and duration.
- `"webpage"`: An `AssetPreviewWebpage` with favicon, embed URL, and site name.
- `undefined`: No type-specific details are available.

### previews

> **previews**: [`AssetPreviewImage`](AssetPreviewImage.md)[]

An array of `AssetPreviewImage` thumbnail images for the preview. Optional.

### title

> **title**: `string`

The preview title (e.g., the page title for a webpage, or the track name for audio).

### type

> **type**: `AssetPreviewType`

The type of preview. See `AssetPreviewType`.

### updatedAt?

> `optional` **updatedAt?**: `Date`

When the preview was last generated. Optional.