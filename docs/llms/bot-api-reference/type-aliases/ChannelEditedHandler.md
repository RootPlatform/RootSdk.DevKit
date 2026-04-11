---
path: bot-api-reference/type-aliases/ChannelEditedHandler.md
audience: bot
category: reference
summary: Callback invoked when a visible channel's properties or permissions change as a side effect of an API operation.
---

> **ChannelEditedHandler** = (`evt`: [`ChannelEditedEvent`](ChannelEditedEvent.md)) => `void`

Callback invoked when a visible channel's properties or permissions change as a side effect of an API operation. Passed via the `eventHandlers` parameter on methods that can trigger permission changes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelEditedEvent`](ChannelEditedEvent.md) |

## Returns

`void`