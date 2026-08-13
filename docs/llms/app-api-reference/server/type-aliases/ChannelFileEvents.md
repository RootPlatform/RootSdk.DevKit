---
path: app-api-reference/server/type-aliases/ChannelFileEvents.md
audience: app
category: reference
summary: Event map type for `ChannelFileClient`. This type defines the event signatures for file-related events.
---

> **ChannelFileEvents** = `object`

Event map type for `ChannelFileClient`. This type defines the event signatures for file-related events.

For event name constants, see `ChannelFileEvent`.

## Properties

### channelFile.created

> **channelFile.created**: (`evt`: [`ChannelFileCreatedEvent`](ChannelFileCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelFileCreatedEvent`](ChannelFileCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelFileEvent, ChannelFileCreatedEvent } from "@rootsdk/server-app";
rootServer.community.channelFile.on(ChannelFileEvent.ChannelFileCreated, (evt: ChannelFileCreatedEvent) => {
  // ...
});
```

### channelFile.deleted

> **channelFile.deleted**: (`evt`: [`ChannelFileDeletedEvent`](ChannelFileDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelFileDeletedEvent`](ChannelFileDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelFileEvent, ChannelFileDeletedEvent } from "@rootsdk/server-app";
rootServer.community.channelFile.on(ChannelFileEvent.ChannelFileDeleted, (evt: ChannelFileDeletedEvent) => {
  // ...
});
```

### channelFile.edited

> **channelFile.edited**: (`evt`: [`ChannelFileEditedEvent`](ChannelFileEditedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelFileEditedEvent`](ChannelFileEditedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelFileEvent, ChannelFileEditedEvent } from "@rootsdk/server-app";
rootServer.community.channelFile.on(ChannelFileEvent.ChannelFileEdited, (evt: ChannelFileEditedEvent) => {
  // ...
});
```

### channelFile.moved

> **channelFile.moved**: (`evt`: [`ChannelFileMovedEvent`](ChannelFileMovedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelFileMovedEvent`](ChannelFileMovedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelFileEvent, ChannelFileMovedEvent } from "@rootsdk/server-app";
rootServer.community.channelFile.on(ChannelFileEvent.ChannelFileMoved, (evt: ChannelFileMovedEvent) => {
  // ...
});
```