---
path: app-api-reference/server/type-aliases/CommunityMemberRoleEvents.md
audience: app
category: reference
summary: Event map type for `CommunityMemberRoleClient`. This type defines the event signatures for member role assignment events.
---

> **CommunityMemberRoleEvents** = `object`

Event map type for `CommunityMemberRoleClient`. This type defines the event signatures for member role assignment events.

For event name constants, see `CommunityMemberRoleEvent`.

## Properties

### communityMemberRole.created()

> **communityMemberRole.created**: (`evt`: [`CommunityMemberRoleCreatedEvent`](CommunityMemberRoleCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityMemberRoleCreatedEvent`](CommunityMemberRoleCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberRoleEvent, CommunityMemberRoleCreatedEvent } from "@rootsdk/server-app";
rootServer.community.communityMemberRoles.on(CommunityMemberRoleEvent.CommunityMemberRoleCreated, (evt: CommunityMemberRoleCreatedEvent) => {
  // ...
});
```

### communityMemberRole.deleted()

> **communityMemberRole.deleted**: (`evt`: [`CommunityMemberRoleDeletedEvent`](CommunityMemberRoleDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityMemberRoleDeletedEvent`](CommunityMemberRoleDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberRoleEvent, CommunityMemberRoleDeletedEvent } from "@rootsdk/server-app";
rootServer.community.communityMemberRoles.on(CommunityMemberRoleEvent.CommunityMemberRoleDeleted, (evt: CommunityMemberRoleDeletedEvent) => {
  // ...
});
```

### communityMemberRole.set.primary()

> **communityMemberRole.set.primary**: (`evt`: [`CommunityMemberRoleSetPrimaryEvent`](CommunityMemberRoleSetPrimaryEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityMemberRoleSetPrimaryEvent`](CommunityMemberRoleSetPrimaryEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberRoleEvent, CommunityMemberRoleSetPrimaryEvent } from "@rootsdk/server-app";
rootServer.community.communityMemberRoles.on(CommunityMemberRoleEvent.CommunityMemberRoleSetPrimary, (evt: CommunityMemberRoleSetPrimaryEvent) => {
  // ...
});
```