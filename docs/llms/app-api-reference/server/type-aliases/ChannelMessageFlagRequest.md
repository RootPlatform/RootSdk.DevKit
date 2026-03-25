---
path: app-api-reference/server/type-aliases/ChannelMessageFlagRequest.md
audience: app
category: reference
summary: Request object for flagging a message for moderation review.
---

> **ChannelMessageFlagRequest** = `object`

Request object for flagging a message for moderation review.

## Properties

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel containing the message. Required.

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the message to flag. Required.

### reason

> **reason**: [`ContentFlagReason`](../enumerations/ContentFlagReason.md)

The reason for flagging the message. Required. Use the `ContentFlagReason` enum values: `Other` (1), `Dmca` (2), `Copyright` (3), `Spam` (4), `Hatespeech` (5), `Violence` (6), `Harassment` (7), `Sexualcontent` (8), `Misinformation` (9), `Impersonation` (10), or `Objectionable` (11).