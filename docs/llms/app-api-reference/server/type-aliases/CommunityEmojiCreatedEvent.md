---
path: app-api-reference/server/type-aliases/CommunityEmojiCreatedEvent.md
audience: app
category: reference
summary: Event payload emitted when a custom emoji is added to the community.
---

> **CommunityEmojiCreatedEvent** = `object`

Event payload emitted when a custom emoji is added to the community.

## Properties

### assetUri

> **assetUri**: `string`

The asset URI of the emoji image.

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### id

> **id**: [`EmojiGuid`](EmojiGuid.md)

The unique identifier of the new emoji.

### shortcode

> **shortcode**: `string`

The text shortcode assigned to the emoji.