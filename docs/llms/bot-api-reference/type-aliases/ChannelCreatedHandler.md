---
path: bot-api-reference/type-aliases/ChannelCreatedHandler.md
audience: bot
category: reference
summary: Callback invoked when a channel becomes visible to your code as a side effect of an API operation.
---

> **ChannelCreatedHandler** = (`evt`: [`ChannelCreatedEvent`](ChannelCreatedEvent.md)) => `void`

Callback invoked when a channel becomes visible to your code as a side effect of an API operation. Passed via the `eventHandlers` parameter on methods that can trigger permission changes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelCreatedEvent`](ChannelCreatedEvent.md) |

## Returns

`void`