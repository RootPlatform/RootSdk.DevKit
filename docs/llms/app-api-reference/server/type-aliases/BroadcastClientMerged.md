---
path: app-api-reference/server/type-aliases/BroadcastClientMerged.md
audience: app
category: reference
summary: Union of all broadcast targeting options. This is the type accepted by generated `broadcast*` methods.
---

> **BroadcastClientMerged** = [`BroadcastClients`](BroadcastClients.md) | [`BroadcastClientContexts`](BroadcastClientContexts.md) | [`CustomMemberGroupGuid`](CustomMemberGroupGuid.md) | [`ReadOnlyMemberGroup`](ReadOnlyMemberGroup.md)

Union of all broadcast targeting options. This is the type accepted by generated `broadcast*` methods. It combines `BroadcastClients`, `BroadcastClientContexts`, `CustomMemberGroupGuid`, and `ReadOnlyMemberGroup`, so you can target by member, device, member group, or send to everyone.