---
path: bot-api-reference/type-aliases/CommunityEmojiDeletedEvent.md
audience: bot
category: reference
summary: Event data emitted when a custom emoji is removed from the community.
---

> **CommunityEmojiDeletedEvent** = `object`

Event data emitted when a custom emoji is removed from the community.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the emoji was deleted.

### id

> **id**: [`EmojiGuid`](EmojiGuid.md)

The unique identifier of the deleted emoji.