---
path: app-api-reference/server/type-aliases/AssetImage.md
audience: app
category: reference
summary: Metadata for an uploaded image asset. Contains links to the image at various resolutions, an inline WebP thumbnail, and aspect ratio information.
---

> **AssetImage** = `object`

Metadata for an uploaded image asset. Contains links to the image at various resolutions, an inline WebP thumbnail, and aspect ratio information.

## Properties

### aspectRatio?

> `optional` **aspectRatio**: [`AssetAspectRatio`](AssetAspectRatio.md)

The image's aspect ratio. Optional; see `AssetAspectRatio`.

### assetLinks

> **assetLinks**: [`AssetImageLink`](AssetImageLink.md)[]

An array of `AssetImageLink` entries, each providing the image at a different resolution.

### isAnimated

> **isAnimated**: `boolean`

Whether the image is animated (e.g. a GIF).

### webP

> **webP**: `Uint8Array`

A small WebP-encoded thumbnail of the image as raw bytes. Can be used for immediate display while full-resolution links load.