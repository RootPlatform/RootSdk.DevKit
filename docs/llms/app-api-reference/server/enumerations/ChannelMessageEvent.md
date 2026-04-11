---
path: app-api-reference/server/enumerations/ChannelMessageEvent.md
audience: app
category: reference
summary: Enum providing string constants for message event names. Use these values when subscribing to events on `ChannelMessageClient`.
---

Enum providing string constants for message event names. Use these values when subscribing to events on `ChannelMessageClient`.

## Enumeration Members

### ChannelMessageCreated

> **ChannelMessageCreated**: `"channelMessage.created"`

Emitted when a new message is created in a channel.

### ChannelMessageDeleted

> **ChannelMessageDeleted**: `"channelMessage.deleted"`

Emitted when a message is deleted from a channel.

### ChannelMessageEdited

> **ChannelMessageEdited**: `"channelMessage.edited"`

Emitted when a message's content is modified.

### ChannelMessagePinCreated

> **ChannelMessagePinCreated**: `"channelMessagePin.created"`

Emitted when a message is pinned to a channel.

### ChannelMessagePinDeleted

> **ChannelMessagePinDeleted**: `"channelMessagePin.deleted"`

Emitted when a pin is removed from a message.

### ChannelMessageReactionCreated

> **ChannelMessageReactionCreated**: `"channelMessageReaction.created"`

Emitted when a reaction is added to a message.

### ChannelMessageReactionDeleted

> **ChannelMessageReactionDeleted**: `"channelMessageReaction.deleted"`

Emitted when a reaction is removed from a message.

### ChannelMessageReactionDeletedFull

> **ChannelMessageReactionDeletedFull**: `"channelMessageReaction.deleted.full"`

### ChannelMessageSetTypingIndicator

> **ChannelMessageSetTypingIndicator**: `"channelMessage.set.typingIndicator"`

Emitted when a user's typing indicator status changes in a channel.