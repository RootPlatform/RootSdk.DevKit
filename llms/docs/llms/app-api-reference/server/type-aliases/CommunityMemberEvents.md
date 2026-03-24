---
path: app-api-reference/server/type-aliases/CommunityMemberEvents.md
audience: app
category: reference
summary: Event map type for `CommunityMemberClient`. This type defines the event signatures for member-related events.
---

> **CommunityMemberEvents** = `object`

Event map type for `CommunityMemberClient`. This type defines the event signatures for member-related events.

For event name constants, see `CommunityMemberEvent`.

## Properties

### communityMember.attach()

> **communityMember.attach**: (`evt`: [`CommunityMemberAttachEvent`](CommunityMemberAttachEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityMemberAttachEvent`](CommunityMemberAttachEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberEvent, CommunityMemberAttachEvent } from "@rootsdk/server-app";
rootServer.community.communityMembers.on(CommunityMemberEvent.CommunityMemberAttach, (evt: CommunityMemberAttachEvent) => {
  // ...
});
```

### communityMember.detach()

> **communityMember.detach**: (`evt`: [`CommunityMemberDetachEvent`](CommunityMemberDetachEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityMemberDetachEvent`](CommunityMemberDetachEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberEvent, CommunityMemberDetachEvent } from "@rootsdk/server-app";
rootServer.community.communityMembers.on(CommunityMemberEvent.CommunityMemberDetach, (evt: CommunityMemberDetachEvent) => {
  // ...
});
```

### user.set.profile()

> **user.set.profile**: (`evt`: [`UserSetProfileEvent`](UserSetProfileEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`UserSetProfileEvent`](UserSetProfileEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityMemberEvent, UserSetProfileEvent } from "@rootsdk/server-app";
rootServer.community.communityMembers.on(CommunityMemberEvent.UserSetProfile, (evt: UserSetProfileEvent) => {
  // ...
});
```