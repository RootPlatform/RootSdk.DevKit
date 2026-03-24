---
path: app-api-reference/server/type-aliases/UserSetProfileEvent.md
audience: app
category: reference
summary: Event payload emitted when a user updates their profile information.
---

> **UserSetProfileEvent** = `object`

Event payload emitted when a user updates their profile information.

## Properties

### bannerAssetUri?

> `optional` **bannerAssetUri**: `string`

### description?

> `optional` **description**: `string`

### profilePictureAssetUri

> **profilePictureAssetUri**: `string`

The URI of the user's updated profile picture.

### userDefinedStatus?

> `optional` **userDefinedStatus**: `string`

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the user who updated their profile.

### username

> **username**: `string`

The user's updated username.