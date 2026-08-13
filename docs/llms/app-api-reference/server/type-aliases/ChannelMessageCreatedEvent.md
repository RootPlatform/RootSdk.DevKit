---
path: app-api-reference/server/type-aliases/ChannelMessageCreatedEvent.md
audience: app
category: reference
summary: Event data emitted when a new message is created in a channel.
---

> **ChannelMessageCreatedEvent** = `object`

Event data emitted when a new message is created in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message.

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

### deletedAt?

> `optional` **deletedAt?**: `Date`

Timestamp when the message was deleted. Undefined for active messages.

### editedAt?

> `optional` **editedAt?**: `Date`

Timestamp when the message was last edited. Undefined if never edited.

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the created message.

### messageContent

> **messageContent**: `string`

The text content of the message.

### messageType

> **messageType**: [`MessageType`](../enumerations/MessageType.md)

The type of message. Use the `MessageType` enum values: `UserMessage` (1) for user-created messages or `System` (2) for system-generated messages.

### messageUris

> **messageUris**: [`MessageUri`](MessageUri.md)[]

Optional array of `MessageUri` objects containing URIs and attachment metadata for any files or media in the message.

### parentMessages

> **parentMessages**: [`ParentMessage`](ParentMessage.md)[]

Optional array of `ParentMessage` objects representing messages this message is replying to.

### pinnedAt?

> `optional` **pinnedAt?**: `Date`

Timestamp when the message was pinned. Undefined if not pinned.

### reactions

> **reactions**: [`MessageReaction`](MessageReaction.md)[]

Optional array of `MessageReaction` objects representing reactions on the message.

### referenceMaps?

> `optional` **referenceMaps?**: [`MessageReferenceMaps`](MessageReferenceMaps.md)

Optional `MessageReferenceMaps` object containing resolved references for users, channels, roles, and assets mentioned in the message.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The ID of the user who created the message.