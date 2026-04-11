---
path: app-api-reference/server/type-aliases/CommunityPermissionEditedHandler.md
audience: app
category: reference
summary: Callback invoked when community-wide permissions change as a side effect of an API operation. Receives the updated `CommunityPermission`.
---

> **CommunityPermissionEditedHandler** = (`evt`: [`CommunityPermission`](CommunityPermission.md)) => `void`

Callback invoked when community-wide permissions change as a side effect of an API operation. Receives the updated `CommunityPermission`. Passed via the `eventHandlers` parameter on methods that can trigger permission changes. This handler runs last, after all channel and channel group handlers have completed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityPermission`](CommunityPermission.md) |

## Returns

`void`