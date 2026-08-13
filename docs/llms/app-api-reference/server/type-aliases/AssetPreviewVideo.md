---
path: app-api-reference/server/type-aliases/AssetPreviewVideo.md
audience: app
category: reference
summary: Video-specific preview metadata within an `AssetPreview`.
---

> **AssetPreviewVideo** = `object`

Video-specific preview metadata within an `AssetPreview`.

## Properties

### bitrate

> **bitrate**: `number`

The video bitrate in bits per second.

### codec

> **codec**: `AssetVideoCodec`

The video codec. See `AssetVideoCodec`.

### duration?

> `optional` **duration?**: `Duration`

The duration of the video. Optional. A `Duration` with `seconds` (bigint) and `nanos` (number) fields.

### format

> **format**: `AssetVideoFormat`

The video container format. See `AssetVideoFormat`.

### fps

> **fps**: `number`

The video frame rate in frames per second.

### height

> **height**: `number`

The video height in pixels.

### width

> **width**: `number`

The video width in pixels.