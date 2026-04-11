---
path: bot-api-reference/type-aliases/UserSetProfileEvent.md
audience: bot
category: reference
summary: Event payload emitted when a user updates any part of their profile (picture, description, banner, or status).
---

> **UserSetProfileEvent** = `object`

Event payload emitted when a user updates any part of their profile (picture, description, banner, or status). Contains all current profile fields, not just the one that changed.

## Properties

### bannerAssetUri?

> `optional` **bannerAssetUri**: `string`

The asset URI of the user's profile banner image. Optional.

### description?

> `optional` **description**: `string`

The user's profile description. Optional.

### profilePictureAssetUri

> **profilePictureAssetUri**: `string`

The asset URI of the user's current profile picture.

### userDefinedStatus?

> `optional` **userDefinedStatus**: `string`

The user's custom status text. Optional.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user whose profile changed.

### username

> **username**: `string`

The user's current username.