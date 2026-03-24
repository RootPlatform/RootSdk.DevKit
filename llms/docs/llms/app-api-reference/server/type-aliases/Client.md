---
path: app-api-reference/server/type-aliases/Client.md
audience: app
category: reference
summary: Represents a community member who currently has your app's channel open on one or more devices.
---

> **Client** = [`DeviceContext`](DeviceContext.md) & `object`

Represents a community member who currently has your app's channel open on one or more devices.

## Type Declaration

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The community where the member is attached.

### deviceIds

> **deviceIds**: [`DeviceGuid`](DeviceGuid.md)[]

All device IDs this member currently has your app open on. A member with multiple devices will have multiple entries.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The member's user ID.