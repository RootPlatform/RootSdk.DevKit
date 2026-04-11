---
path: bot-api-reference/type-aliases/ChannelMessageEvents.md
audience: bot
category: reference
summary: Event map type for `ChannelMessageClient`. This type defines the event signatures for message-related events.
---

> **ChannelMessageEvents** = `object`

Event map type for `ChannelMessageClient`. This type defines the event signatures for message-related events.

For event name constants, see `ChannelMessageEvent`.

## Properties

### channelMessage.created()

> **channelMessage.created**: (`evt`: [`ChannelMessageCreatedEvent`](ChannelMessageCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessageCreatedEvent`](ChannelMessageCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessageCreatedEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageCreated, (evt: ChannelMessageCreatedEvent) => {
  // ...
});
```

### channelMessage.deleted()

> **channelMessage.deleted**: (`evt`: [`ChannelMessageDeletedEvent`](ChannelMessageDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessageDeletedEvent`](ChannelMessageDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessageDeletedEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageDeleted, (evt: ChannelMessageDeletedEvent) => {
  // ...
});
```

### channelMessage.edited()

> **channelMessage.edited**: (`evt`: [`ChannelMessageEditedEvent`](ChannelMessageEditedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessageEditedEvent`](ChannelMessageEditedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessageEditedEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageEdited, (evt: ChannelMessageEditedEvent) => {
  // ...
});
```

### channelMessage.set.typingIndicator()

> **channelMessage.set.typingIndicator**: (`evt`: [`ChannelMessageSetTypingIndicatorEvent`](ChannelMessageSetTypingIndicatorEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessageSetTypingIndicatorEvent`](ChannelMessageSetTypingIndicatorEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessageSetTypingIndicatorEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageSetTypingIndicator, (evt: ChannelMessageSetTypingIndicatorEvent) => {
  // ...
});
```

### channelMessagePin.created()

> **channelMessagePin.created**: (`evt`: [`ChannelMessagePinCreatedEvent`](ChannelMessagePinCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessagePinCreatedEvent`](ChannelMessagePinCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessagePinCreatedEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessagePinCreated, (evt: ChannelMessagePinCreatedEvent) => {
  // ...
});
```

### channelMessagePin.deleted()

> **channelMessagePin.deleted**: (`evt`: [`ChannelMessagePinDeletedEvent`](ChannelMessagePinDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessagePinDeletedEvent`](ChannelMessagePinDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessagePinDeletedEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessagePinDeleted, (evt: ChannelMessagePinDeletedEvent) => {
  // ...
});
```

### channelMessageReaction.created()

> **channelMessageReaction.created**: (`evt`: [`ChannelMessageReactionCreatedEvent`](ChannelMessageReactionCreatedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessageReactionCreatedEvent`](ChannelMessageReactionCreatedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessageReactionCreatedEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageReactionCreated, (evt: ChannelMessageReactionCreatedEvent) => {
  // ...
});
```

### channelMessageReaction.deleted()

> **channelMessageReaction.deleted**: (`evt`: [`ChannelMessageReactionDeletedEvent`](ChannelMessageReactionDeletedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessageReactionDeletedEvent`](ChannelMessageReactionDeletedEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessageReactionDeletedEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageReactionDeleted, (evt: ChannelMessageReactionDeletedEvent) => {
  // ...
});
```

### channelMessageReaction.deleted.full()

> **channelMessageReaction.deleted.full**: (`evt`: [`ChannelMessageReactionDeletedFullEvent`](ChannelMessageReactionDeletedFullEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelMessageReactionDeletedFullEvent`](ChannelMessageReactionDeletedFullEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelMessageEvent, ChannelMessageReactionDeletedFullEvent } from "@rootsdk/server-bot";
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageReactionDeletedFull, (evt: ChannelMessageReactionDeletedFullEvent) => {
  // ...
});
```