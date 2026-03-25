---
path: bot-api-reference/type-aliases/RootBotStartState.md
audience: bot
category: reference
summary: Object type with properties: communityId, communityMembers, communityRoles, globalSettings (Root Core).
---

> **RootBotStartState** = `object`

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### communityMembers

> **communityMembers**: `Map`<[`UserGuid`](UserGuid.md), `Set`<[`CommunityRoleGuid`](CommunityRoleGuid.md)>>

### communityRoles

> **communityRoles**: `Map`<[`CommunityRoleGuid`](CommunityRoleGuid.md), \{ `id`: [`CommunityRoleGuid`](CommunityRoleGuid.md); `name`: `string`; \}>

### globalSettings

> **globalSettings**: [`GlobalSettings`](GlobalSettings.md) | `undefined`