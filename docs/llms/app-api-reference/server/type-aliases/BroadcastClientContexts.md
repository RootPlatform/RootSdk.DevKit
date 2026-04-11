---
path: app-api-reference/server/type-aliases/BroadcastClientContexts.md
audience: app
category: reference
summary: Specifies which clients receive a broadcast at the device level.
---

> **BroadcastClientContexts** = [`ClientContext`](ClientContext.md)[] | `"all"` | [`CommunityGuid`](CommunityGuid.md)

Specifies which clients receive a broadcast at the device level. Pass a `ClientContext` array to target specific devices, `"all"` to target every connected device, or a `CommunityGuid` to target all devices in a specific community.