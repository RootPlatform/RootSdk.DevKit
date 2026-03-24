---
path: app-api-reference/server/type-aliases/ClientContext.md
audience: app
category: reference
summary: Identifies a specific member and device. Used in device-level attachment events (`ClientEvent.UserDeviceAttached`, `ClientEvent.UserDeviceDetached`).
---

> **ClientContext** = [`DeviceContext`](DeviceContext.md) & `object`

Identifies a specific member and device. Used in device-level attachment events (`ClientEvent.UserDeviceAttached`, `ClientEvent.UserDeviceDetached`).

## Type Declaration

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The community where the member is attached.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The member's user ID.