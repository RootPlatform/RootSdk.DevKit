---
path: bot-api-reference/type-aliases/ChannelDeletedHandler.md
audience: bot
category: reference
summary: Callback invoked when a channel is no longer visible to your code as a side effect of an API operation.
---

> **ChannelDeletedHandler** = (`evt`: [`ChannelDeletedEvent`](ChannelDeletedEvent.md)) => `void`

Callback invoked when a channel is no longer visible to your code as a side effect of an API operation. This can mean the channel was deleted or that your code lost permission to see it. Passed via the `eventHandlers` parameter on methods that can trigger permission changes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelDeletedEvent`](ChannelDeletedEvent.md) |

## Returns

`void`