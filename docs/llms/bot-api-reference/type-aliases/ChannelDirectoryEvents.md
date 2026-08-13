---
path: bot-api-reference/type-aliases/ChannelDirectoryEvents.md
audience: bot
category: reference
summary: Event map type for `ChannelDirectoryClient`. This type defines the event signatures for directory-related events.
---

> **ChannelDirectoryEvents** = `object`

Event map type for `ChannelDirectoryClient`. This type defines the event signatures for directory-related events.

For event name constants, see `ChannelDirectoryEvent`.

## Properties

### channelDirectory.created

> **channelDirectory.created**: (`evt`: [`ChannelDirectoryCreatedEvent`](ChannelDirectoryCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelDirectoryCreatedEvent`](ChannelDirectoryCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelDirectoryEvent, ChannelDirectoryCreatedEvent } from "@rootsdk/server-bot";
rootServer.community.channelDirectories.on(ChannelDirectoryEvent.ChannelDirectoryCreated, (evt: ChannelDirectoryCreatedEvent) => {
  // ...
});
```

### channelDirectory.deleted

> **channelDirectory.deleted**: (`evt`: [`ChannelDirectoryDeletedEvent`](ChannelDirectoryDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelDirectoryDeletedEvent`](ChannelDirectoryDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelDirectoryEvent, ChannelDirectoryDeletedEvent } from "@rootsdk/server-bot";
rootServer.community.channelDirectories.on(ChannelDirectoryEvent.ChannelDirectoryDeleted, (evt: ChannelDirectoryDeletedEvent) => {
  // ...
});
```

### channelDirectory.edited

> **channelDirectory.edited**: (`evt`: [`ChannelDirectoryEditedEvent`](ChannelDirectoryEditedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelDirectoryEditedEvent`](ChannelDirectoryEditedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelDirectoryEvent, ChannelDirectoryEditedEvent } from "@rootsdk/server-bot";
rootServer.community.channelDirectories.on(ChannelDirectoryEvent.ChannelDirectoryEdited, (evt: ChannelDirectoryEditedEvent) => {
  // ...
});
```

### channelDirectory.moved

> **channelDirectory.moved**: (`evt`: [`ChannelDirectoryMovedEvent`](ChannelDirectoryMovedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelDirectoryMovedEvent`](ChannelDirectoryMovedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelDirectoryEvent, ChannelDirectoryMovedEvent } from "@rootsdk/server-bot";
rootServer.community.channelDirectories.on(ChannelDirectoryEvent.ChannelDirectoryMoved, (evt: ChannelDirectoryMovedEvent) => {
  // ...
});
```