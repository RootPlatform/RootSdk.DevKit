---
path: app-api-reference/server/type-aliases/AssetGetResponse.md
audience: app
category: reference
summary: Response containing metadata for the requested assets.
---

> **AssetGetResponse** = `object`

Response containing metadata for the requested assets.

## Properties

### assets

> **assets**: `object`

Map of asset URIs to their `AssetInformation`. Each entry contains the download link, expiry, asset ID, and optional preview data. Only URIs that matched a known asset appear as keys.

#### Index Signature

[`key`: `string`]: [`AssetInformation`](AssetInformation.md)