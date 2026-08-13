---
path: app-api-reference/server/type-aliases/AssetPreviewAudio.md
audience: app
category: reference
summary: Audio-specific preview metadata within an `AssetPreview`.
---

> **AssetPreviewAudio** = `object`

Audio-specific preview metadata within an `AssetPreview`.

## Properties

### bitrate

> **bitrate**: `number`

The audio bitrate in bits per second.

### codec

> **codec**: `AssetAudioCodec`

The audio codec. See `AssetAudioCodec`.

### duration?

> `optional` **duration?**: `Duration`

The duration of the audio. Optional. A `Duration` with `seconds` (bigint) and `nanos` (number) fields.

### format

> **format**: `AssetAudioFormat`

The audio container format. See `AssetAudioFormat`.

### sampleRate

> **sampleRate**: `number`

The audio sample rate in Hz.