---
path: app-api-reference/server/type-aliases/CommunityEmojiEvents.md
audience: app
category: reference
summary: Event map type for `CommunityEmojiClient`. This type defines the event signatures for community emoji-related events.
---

> **CommunityEmojiEvents** = `object`

Event map type for `CommunityEmojiClient`. This type defines the event signatures for community emoji-related events.

For event name constants, see `CommunityEmojiEvent`.

## Properties

### communityEmoji.created

> **communityEmoji.created**: (`evt`: [`CommunityEmojiCreatedEvent`](CommunityEmojiCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityEmojiCreatedEvent`](CommunityEmojiCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityEmojiEvent, CommunityEmojiCreatedEvent } from "@rootsdk/server-app";
rootServer.community.communityEmoji.on(CommunityEmojiEvent.CommunityEmojiCreated, (evt: CommunityEmojiCreatedEvent) => {
  // ...
});
```

### communityEmoji.deleted

> **communityEmoji.deleted**: (`evt`: [`CommunityEmojiDeletedEvent`](CommunityEmojiDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`CommunityEmojiDeletedEvent`](CommunityEmojiDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, CommunityEmojiEvent, CommunityEmojiDeletedEvent } from "@rootsdk/server-app";
rootServer.community.communityEmoji.on(CommunityEmojiEvent.CommunityEmojiDeleted, (evt: CommunityEmojiDeletedEvent) => {
  // ...
});
```