---
path: bot-api-reference/type-aliases/RootBotStartState.md
audience: bot
category: reference
summary: Snapshot of the community's current state, passed to your `BotStartingCallback` during bot server startup.
---

> **RootBotStartState** = `object`

Snapshot of the community's current state, passed to your `BotStartingCallback` during bot server startup. Use this to initialize your bot's in-memory state without making API calls.

## Properties

### communityId

> `readonly` **communityId**: [`CommunityGuid`](CommunityGuid.md)

The GUID of the community your bot is installed in.

### communityMembers

> `readonly` **communityMembers**: `ReadonlyMap`<[`UserGuid`](UserGuid.md), `ReadonlySet`<[`CommunityRoleGuid`](CommunityRoleGuid.md)>>

A `Map` of user GUIDs to `Set<CommunityRoleGuid>`. Each entry represents a community member and the set of role GUIDs assigned to them.

### communityRoles

> `readonly` **communityRoles**: `ReadonlyMap`<[`CommunityRoleGuid`](CommunityRoleGuid.md), `Readonly`<\{ `id`: [`CommunityRoleGuid`](CommunityRoleGuid.md); `name`: `string`; \}>>

A `Map` of community role GUIDs to objects containing `id` and `name`. Represents all roles defined in the community at startup.

### globalSettings

> `readonly` **globalSettings**: [`GlobalSettings`](GlobalSettings.md) | `undefined`

The bot's `GlobalSettings` object if the bot has defined global settings in its manifest, or `undefined` if it has not.