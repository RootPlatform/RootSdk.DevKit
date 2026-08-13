---
path: app-api-reference/server/type-aliases/CommunityEvents.md
audience: app
category: reference
summary: Event map type for `CommunityClient`. This type defines the event signatures for community-related events.
---

> **CommunityEvents** = `object`

Event map type for `CommunityClient`. This type defines the event signatures for community-related events.

For event name constants, see `CommunityEvent`.

## Properties

### community.edited

> **community.edited**: (`evt`: [`CommunityEditedEvent`](CommunityEditedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityEditedEvent`](CommunityEditedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityEvent, CommunityEditedEvent } from "@rootsdk/server-app";
rootServer.community.communities.on(CommunityEvent.CommunityEdited, (evt: CommunityEditedEvent) => {
  // ...
});
```

### community.joined

> **community.joined**: (`evt`: [`CommunityJoinedEvent`](CommunityJoinedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityJoinedEvent`](CommunityJoinedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityEvent, CommunityJoinedEvent } from "@rootsdk/server-app";
rootServer.community.communities.on(CommunityEvent.CommunityJoined, (evt: CommunityJoinedEvent) => {
  // ...
});
```

### community.leave

> **community.leave**: (`evt`: [`CommunityLeaveEvent`](CommunityLeaveEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityLeaveEvent`](CommunityLeaveEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityEvent, CommunityLeaveEvent } from "@rootsdk/server-app";
rootServer.community.communities.on(CommunityEvent.CommunityLeave, (evt: CommunityLeaveEvent) => {
  // ...
});
```