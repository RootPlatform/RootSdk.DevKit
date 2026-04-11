---
path: app-api-reference/client/type-aliases/AppGuid.md
audience: app
category: reference
summary: Identifies an app or bot. Branded with `RootGuidType.App`. Both apps and bots share this type.
---

> **AppGuid** = `string` & `object`

Identifies an app or bot. Branded with `RootGuidType.App`. Both apps and bots share this type. This identifies the app or bot itself, not a specific installation; see `CommunityAppGuid` for the per-community identifier.

## Type Declaration

### __rootGuidType

> **__rootGuidType**: [`App`](../enumerations/RootGuidType.md#app)