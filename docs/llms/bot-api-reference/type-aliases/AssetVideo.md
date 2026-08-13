---
path: bot-api-reference/type-aliases/AssetVideo.md
audience: bot
category: reference
summary: Metadata for an uploaded video asset. Provides streaming URLs (HLS and DASH), a thumbnail, an animated preview, and a direct download URL.
---

> **AssetVideo** = `object`

Metadata for an uploaded video asset. Provides streaming URLs (HLS and DASH), a thumbnail, an animated preview, and a direct download URL.

## Properties

### aspectRatio?

> `optional` **aspectRatio?**: [`AssetAspectRatio`](AssetAspectRatio.md)

The video's aspect ratio. Optional; see `AssetAspectRatio`.

### dashUrl

> **dashUrl**: `string`

The DASH streaming URL for the video.

### downloadUrl

> **downloadUrl**: `string`

A direct download URL for the original video file.

### duration?

> `optional` **duration?**: `Duration`

The duration of the video. Optional. A `Duration` with `seconds` (bigint) and `nanos` (number) fields.

### hlsUrl

> **hlsUrl**: `string`

The HLS streaming URL for the video.

### previewUrl

> **previewUrl**: `string`

A URL to a short animated preview of the video.

### thumbnailUrl

> **thumbnailUrl**: `string`

A URL to a static thumbnail image of the video.