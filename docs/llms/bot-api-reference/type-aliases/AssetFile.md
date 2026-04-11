---
path: bot-api-reference/type-aliases/AssetFile.md
audience: bot
category: reference
summary: Metadata for an uploaded file asset that is not an image or video (e.g. a PDF, ZIP, or document).
---

> **AssetFile** = `object`

Metadata for an uploaded file asset that is not an image or video (e.g. a PDF, ZIP, or document).

## Properties

### extensions

> **extensions**: `string`

The file extension (e.g., `"pdf"`).

### length

> **length**: `bigint`

The file size in bytes.

### mimeType

> **mimeType**: `string`

The MIME type of the file (e.g., `"application/pdf"`).

### url

> **url**: `string`

The download URL for the file.