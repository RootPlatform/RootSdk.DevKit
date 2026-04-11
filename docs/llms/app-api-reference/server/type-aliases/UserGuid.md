---
path: app-api-reference/server/type-aliases/UserGuid.md
audience: app
category: reference
summary: Identifies a user, app, or bot account. Branded with `RootGuidType.Person` or `RootGuidType.App`, since users, apps, and bots can all author messages...
---

> **UserGuid** = `string` & `object`

Identifies a user, app, or bot account. Branded with `RootGuidType.Person` or `RootGuidType.App`, since users, apps, and bots can all author messages and hold permissions.

## Type Declaration

### __rootGuidType

> **__rootGuidType**: [`Person`](../enumerations/RootGuidType.md#person) | [`App`](../enumerations/RootGuidType.md#app)