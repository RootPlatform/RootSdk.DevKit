---
path: app-api-reference/server/type-aliases/CommunityRoleEvents.md
audience: app
category: reference
summary: Event map type for `CommunityRoleClient`. This type defines the event signatures for role-related events.
---

> **CommunityRoleEvents** = `object`

Event map type for `CommunityRoleClient`. This type defines the event signatures for role-related events.

For event name constants, see `CommunityRoleEvent`.

## Properties

### communityRole.created()

> **communityRole.created**: (`evt`: [`CommunityRoleCreatedEvent`](CommunityRoleCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityRoleCreatedEvent`](CommunityRoleCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityRoleEvent, CommunityRoleCreatedEvent } from "@rootsdk/server-app";
rootServer.community.communityRoles.on(CommunityRoleEvent.CommunityRoleCreated, (evt: CommunityRoleCreatedEvent) => {
  // ...
});
```

### communityRole.deleted()

> **communityRole.deleted**: (`evt`: [`CommunityRoleDeletedEvent`](CommunityRoleDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityRoleDeletedEvent`](CommunityRoleDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityRoleEvent, CommunityRoleDeletedEvent } from "@rootsdk/server-app";
rootServer.community.communityRoles.on(CommunityRoleEvent.CommunityRoleDeleted, (evt: CommunityRoleDeletedEvent) => {
  // ...
});
```

### communityRole.edited()

> **communityRole.edited**: (`evt`: [`CommunityRoleEditedEvent`](CommunityRoleEditedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityRoleEditedEvent`](CommunityRoleEditedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityRoleEvent, CommunityRoleEditedEvent } from "@rootsdk/server-app";
rootServer.community.communityRoles.on(CommunityRoleEvent.CommunityRoleEdited, (evt: CommunityRoleEditedEvent) => {
  // ...
});
```

### communityRole.moved()

> **communityRole.moved**: (`evt`: [`CommunityRoleMovedEvent`](CommunityRoleMovedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityRoleMovedEvent`](CommunityRoleMovedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityRoleEvent, CommunityRoleMovedEvent } from "@rootsdk/server-app";
rootServer.community.communityRoles.on(CommunityRoleEvent.CommunityRoleMoved, (evt: CommunityRoleMovedEvent) => {
  // ...
});
```