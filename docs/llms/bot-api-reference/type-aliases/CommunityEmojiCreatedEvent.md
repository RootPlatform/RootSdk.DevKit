---
path: bot-api-reference/type-aliases/CommunityEmojiCreatedEvent.md
audience: bot
category: reference
summary: Event data emitted when a new custom emoji is added to the community.
---

> **CommunityEmojiCreatedEvent** = `object`

Event data emitted when a new custom emoji is added to the community.

## Properties

### assetUri

> **assetUri**: `string`

The URI of the emoji image asset.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community where the emoji was created.

### id

> **id**: [`EmojiGuid`](EmojiGuid.md)

The unique identifier of the new emoji.

### shortcode

> **shortcode**: `string`

The text shortcode assigned to the emoji.