---
path: app-api-reference/client/type-aliases/CommunityAppGuid.md
audience: app
category: reference
summary: Identifies an app or bot installed in a specific community. Branded with `RootGuidType.CommunityApp`. Both apps and bots share this type.
---

> **CommunityAppGuid** = `string` & `object`

Identifies an app or bot installed in a specific community. Branded with `RootGuidType.CommunityApp`. Both apps and bots share this type. This is distinct from `AppGuid`, which identifies the app or bot itself regardless of which community it is installed in.

## Type Declaration

### __rootGuidType

> **__rootGuidType**: [`CommunityApp`](../enumerations/RootGuidType.md#communityapp)