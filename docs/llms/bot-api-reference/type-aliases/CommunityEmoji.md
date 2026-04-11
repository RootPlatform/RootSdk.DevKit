---
path: bot-api-reference/type-aliases/CommunityEmoji.md
audience: bot
category: reference
summary: Represents a custom emoji in a community. Community emojis are custom images that members can reference by shortcode in messages.
---

> **CommunityEmoji** = `object`

Represents a custom emoji in a community. Community emojis are custom images that members can reference by shortcode in messages.

## Properties

### assetUri

> **assetUri**: `string`

The URI of the emoji image asset.

### id

> **id**: [`EmojiGuid`](EmojiGuid.md)

The unique identifier of the emoji.

### shortcode

> **shortcode**: `string`

The text shortcode used to reference the emoji (for example, `:team-logo:`). Shortcodes are unique within a community.