---
path: bot-api-reference/type-aliases/ChannelGroupEditedHandler.md
audience: bot
category: reference
summary: Callback invoked when a visible channel group's properties or permissions change as a side effect of an API operation.
---

> **ChannelGroupEditedHandler** = (`evt`: [`ChannelGroupEditedEvent`](ChannelGroupEditedEvent.md)) => `void`

Callback invoked when a visible channel group's properties or permissions change as a side effect of an API operation. Passed via the `eventHandlers` parameter on methods that can trigger permission changes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelGroupEditedEvent`](ChannelGroupEditedEvent.md) |

## Returns

`void`