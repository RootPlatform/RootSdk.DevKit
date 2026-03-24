---
path: app-api-reference/server/type-aliases/RootAppStartState.md
audience: app
category: reference
summary: Object type with properties: channelId, communityId, communityMembers, communityRoles, ... (Root Core).
---

> **RootAppStartState** = `object`

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

### communityMembers

> **communityMembers**: `Map`<[`UserGuid`](UserGuid.md), `Set`<[`CommunityRoleGuid`](CommunityRoleGuid.md)>>

### communityRoles

> **communityRoles**: `Map`<[`CommunityRoleGuid`](CommunityRoleGuid.md), \{ `id`: [`CommunityRoleGuid`](CommunityRoleGuid.md); `name`: `string`; \}>

### globalSettings

> **globalSettings**: [`GlobalSettings`](GlobalSettings.md) | `undefined`