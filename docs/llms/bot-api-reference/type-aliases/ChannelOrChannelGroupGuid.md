---
path: bot-api-reference/type-aliases/ChannelOrChannelGroupGuid.md
audience: bot
category: reference
summary: Identifies either a channel or a channel group. Branded with `RootGuidType.Channel` or `RootGuidType.ChannelGroup`.
---

> **ChannelOrChannelGroupGuid** = `string` & `object`

Identifies either a channel or a channel group. Branded with `RootGuidType.Channel` or `RootGuidType.ChannelGroup`. Used in operations that can target either entity type.

## Type Declaration

### __rootGuidType

> **__rootGuidType**: [`Channel`](../enumerations/RootGuidType.md#channel) | [`ChannelGroup`](../enumerations/RootGuidType.md#channelgroup)