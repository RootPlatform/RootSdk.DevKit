---
path: app-api-reference/server/type-aliases/BroadcastClients.md
audience: app
category: reference
summary: Specifies which clients receive a broadcast at the member level.
---

> **BroadcastClients** = [`Client`](Client.md)[] | `"all"` | [`CommunityGuid`](CommunityGuid.md)

Specifies which clients receive a broadcast at the member level. Pass a `Client` array to target specific members (all their devices), `"all"` to target every connected member, or a `CommunityGuid` to target all members in a specific community.