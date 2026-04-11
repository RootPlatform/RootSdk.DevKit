---
path: app-api-reference/server/type-aliases/ChannelGroupCreatedHandler.md
audience: app
category: reference
summary: Callback invoked when a channel group becomes visible to your code as a side effect of an API operation.
---

> **ChannelGroupCreatedHandler** = (`evt`: [`ChannelGroupCreatedEvent`](ChannelGroupCreatedEvent.md)) => `void`

Callback invoked when a channel group becomes visible to your code as a side effect of an API operation. Passed via the `eventHandlers` parameter on methods that can trigger permission changes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelGroupCreatedEvent`](ChannelGroupCreatedEvent.md) |

## Returns

`void`