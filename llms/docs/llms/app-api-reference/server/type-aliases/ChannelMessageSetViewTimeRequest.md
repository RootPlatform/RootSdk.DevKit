---
path: app-api-reference/server/type-aliases/ChannelMessageSetViewTimeRequest.md
audience: app
category: reference
summary: Request object for updating the last viewed timestamp in a channel.
---

> **ChannelMessageSetViewTimeRequest** = `object`

Request object for updating the last viewed timestamp in a channel.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel to mark as viewed. Required. This updates the user's last viewed timestamp to the current time, affecting unread message counts.