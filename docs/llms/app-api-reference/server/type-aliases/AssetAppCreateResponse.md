---
path: app-api-reference/server/type-aliases/AssetAppCreateResponse.md
audience: app
category: reference
summary: Response containing the permanent asset URIs created from upload tokens.
---

> **AssetAppCreateResponse** = `object`

Response containing the permanent asset URIs created from upload tokens.

## Properties

### assets

> **assets**: `object`

Map of upload tokens to their permanent asset URIs. The keys are the original upload tokens from the request, and the values are the permanent URIs you can store and reference.

#### Index Signature

[`key`: `string`]: `string`