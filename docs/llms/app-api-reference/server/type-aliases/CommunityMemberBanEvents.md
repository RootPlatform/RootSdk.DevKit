---
path: app-api-reference/server/type-aliases/CommunityMemberBanEvents.md
audience: app
category: reference
summary: Event map type for `CommunityMemberBanClient`. This type defines the event signatures for community member ban-related events.
---

> **CommunityMemberBanEvents** = `object`

Event map type for `CommunityMemberBanClient`. This type defines the event signatures for community member ban-related events.

For event name constants, see `CommunityMemberBanEvent`.

## Properties

### communityMemberBan.created()

> **communityMemberBan.created**: (`evt`: [`CommunityMemberBanCreatedEvent`](CommunityMemberBanCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityMemberBanCreatedEvent`](CommunityMemberBanCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberBanEvent, CommunityMemberBanCreatedEvent } from "@rootsdk/server-app";
rootServer.community.communityMemberBans.on(CommunityMemberBanEvent.CommunityMemberBanCreated, (evt: CommunityMemberBanCreatedEvent) => {
  // ...
});
```

### communityMemberBan.deleted()

> **communityMemberBan.deleted**: (`evt`: [`CommunityMemberBanDeletedEvent`](CommunityMemberBanDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityMemberBanDeletedEvent`](CommunityMemberBanDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberBanEvent, CommunityMemberBanDeletedEvent } from "@rootsdk/server-app";
rootServer.community.communityMemberBans.on(CommunityMemberBanEvent.CommunityMemberBanDeleted, (evt: CommunityMemberBanDeletedEvent) => {
  // ...
});
```