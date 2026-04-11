---
path: bot-api-reference/type-aliases/ChannelGroupDeletedHandler.md
audience: bot
category: reference
summary: Callback invoked when a channel group is no longer visible to your code as a side effect of an API operation.
---

> **ChannelGroupDeletedHandler** = (`evt`: [`ChannelGroupDeletedEvent`](ChannelGroupDeletedEvent.md)) => `void`

Callback invoked when a channel group is no longer visible to your code as a side effect of an API operation. This can mean the group was deleted or that your code lost permission to see it. Passed via the `eventHandlers` parameter on methods that can trigger permission changes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelGroupDeletedEvent`](ChannelGroupDeletedEvent.md) |

## Returns

`void`