---
path: app-api-reference/server/type-aliases/RootGuid.md
audience: app
category: reference
summary: The base type for all Root identifiers. A branded string that carries a `RootGuidType` at compile time.
---

> **RootGuid** = `string` & `object`

The base type for all Root identifiers. A branded string that carries a `RootGuidType` at compile time. All specific GUID types (such as `UserGuid` and `ChannelGuid`) extend this type. At runtime, a `RootGuid` is a 22-character base64-encoded string.

## Type Declaration

### __rootGuidType

> **__rootGuidType**: [`RootGuidType`](../enumerations/RootGuidType.md)