---
path: bot-api-reference/type-aliases/ChannelGroupEvents.md
audience: bot
category: reference
summary: Event map type for `ChannelGroupClient`. This type defines the event signatures for channel group events.
---

> **ChannelGroupEvents** = `object`

Event map type for `ChannelGroupClient`. This type defines the event signatures for channel group events.

For event name constants, see `ChannelGroupEvent`.

## Properties

### channelGroup.created

> **channelGroup.created**: (`evt`: [`ChannelGroupCreatedEvent`](ChannelGroupCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelGroupCreatedEvent`](ChannelGroupCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelGroupEvent, ChannelGroupCreatedEvent } from "@rootsdk/server-bot";
rootServer.community.channelGroupss.on(ChannelGroupEvent.ChannelGroupCreated, (evt: ChannelGroupCreatedEvent) => {
  // ...
});
```

### channelGroup.deleted

> **channelGroup.deleted**: (`evt`: [`ChannelGroupDeletedEvent`](ChannelGroupDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelGroupDeletedEvent`](ChannelGroupDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelGroupEvent, ChannelGroupDeletedEvent } from "@rootsdk/server-bot";
rootServer.community.channelGroupss.on(ChannelGroupEvent.ChannelGroupDeleted, (evt: ChannelGroupDeletedEvent) => {
  // ...
});
```

### channelGroup.edited

> **channelGroup.edited**: (`evt`: [`ChannelGroupEditedEvent`](ChannelGroupEditedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelGroupEditedEvent`](ChannelGroupEditedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelGroupEvent, ChannelGroupEditedEvent } from "@rootsdk/server-bot";
rootServer.community.channelGroupss.on(ChannelGroupEvent.ChannelGroupEdited, (evt: ChannelGroupEditedEvent) => {
  // ...
});
```

### channelGroup.moved

> **channelGroup.moved**: (`evt`: [`ChannelGroupMovedEvent`](ChannelGroupMovedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelGroupMovedEvent`](ChannelGroupMovedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelGroupEvent, ChannelGroupMovedEvent } from "@rootsdk/server-bot";
rootServer.community.channelGroupss.on(ChannelGroupEvent.ChannelGroupMoved, (evt: ChannelGroupMovedEvent) => {
  // ...
});
```