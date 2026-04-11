---
path: app-api-reference/server/type-aliases/AssetImageLink.md
audience: app
category: reference
summary: A URL to an image asset at a specific resolution. An `AssetImage` contains multiple links, one per available resolution.
---

> **AssetImageLink** = `object`

A URL to an image asset at a specific resolution. An `AssetImage` contains multiple links, one per available resolution.

## Properties

### heightEstimate

> **heightEstimate**: `number`

The estimated height of the image in pixels at this resolution.

### largestDimensionLimit

> **largestDimensionLimit**: `number`

The maximum pixel size of the image's largest dimension (width or height) at this resolution.

### url

> **url**: `string`

The URL to download the image at this resolution.

### widthEstimate

> **widthEstimate**: `number`

The estimated width of the image in pixels at this resolution.