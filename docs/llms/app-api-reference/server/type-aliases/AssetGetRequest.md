---
path: app-api-reference/server/type-aliases/AssetGetRequest.md
audience: app
category: reference
summary: Request to retrieve metadata for one or more assets.
---

> **AssetGetRequest** = `object`

Request to retrieve metadata for one or more assets.

## Properties

### uris

> **uris**: `string`[]

Array of asset URIs to look up. Required. URIs that do not match a known asset are silently omitted from the response rather than causing an error.