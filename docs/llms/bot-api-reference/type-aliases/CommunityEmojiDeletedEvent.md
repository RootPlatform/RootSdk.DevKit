---
path: bot-api-reference/type-aliases/CommunityEmojiDeletedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a custom emoji is removed from the community.
---

> **CommunityEmojiDeletedEvent** = `object`

Event payload emitted when a custom emoji is removed from the community. The deleted emoji no longer appears in `CommunityEmojiClient.list()` results, but existing messages that reference it continue to render the emoji image normally.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### id

> **id**: [`EmojiGuid`](EmojiGuid.md)

The unique identifier of the deleted emoji.