---
path: app-api-reference/client/enumerations/ImageUriResolution.md
audience: app
category: reference
summary: Enum controlling which resolution variant of an image is requested from `rootClient.assets.toImageUrl()`.
---

Enum controlling which resolution variant of an image is requested from `rootClient.assets.toImageUrl()`. The host Root client resolves each value to a specific pre-scaled variant of the asset.

## Enumeration Members

### Large

> **Large**: `"large"`

A large pre-scaled variant.

### Medium

> **Medium**: `"medium"`

A medium pre-scaled variant.

### Original

> **Original**: `"original"`

The unscaled source image.

### Small

> **Small**: `"small"`

A small pre-scaled variant.