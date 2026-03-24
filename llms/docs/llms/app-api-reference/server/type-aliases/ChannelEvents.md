---
path: app-api-reference/server/type-aliases/ChannelEvents.md
audience: app
category: reference
summary: Event map type for `ChannelClient`. This type defines the event signatures for channel-related events.
---

> **ChannelEvents** = `object`

Event map type for `ChannelClient`. This type defines the event signatures for channel-related events.

For event name constants, see `ChannelEvent`.

## Properties

### channel.created()

> **channel.created**: (`evt`: [`ChannelCreatedEvent`](ChannelCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelCreatedEvent`](ChannelCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelEvent, ChannelCreatedEvent } from "@rootsdk/server-app";
rootServer.community.channels.on(ChannelEvent.ChannelCreated, (evt: ChannelCreatedEvent) => {
  // ...
});
```

### channel.deleted()

> **channel.deleted**: (`evt`: [`ChannelDeletedEvent`](ChannelDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelDeletedEvent`](ChannelDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelEvent, ChannelDeletedEvent } from "@rootsdk/server-app";
rootServer.community.channels.on(ChannelEvent.ChannelDeleted, (evt: ChannelDeletedEvent) => {
  // ...
});
```

### channel.edited()

> **channel.edited**: (`evt`: [`ChannelEditedEvent`](ChannelEditedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelEditedEvent`](ChannelEditedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelEvent, ChannelEditedEvent } from "@rootsdk/server-app";
rootServer.community.channels.on(ChannelEvent.ChannelEdited, (evt: ChannelEditedEvent) => {
  // ...
});
```

### channel.moved()

> **channel.moved**: (`evt`: [`ChannelMovedEvent`](ChannelMovedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMovedEvent`](ChannelMovedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelEvent, ChannelMovedEvent } from "@rootsdk/server-app";
rootServer.community.channels.on(ChannelEvent.ChannelMoved, (evt: ChannelMovedEvent) => {
  // ...
});
```