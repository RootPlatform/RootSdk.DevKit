---
path: bot-api-reference/type-aliases/ChannelMessageCreateRequest.md
audience: bot
category: reference
summary: Request object for creating a new message in a channel.
---

> **ChannelMessageCreateRequest** = `object`

Request object for creating a new message in a channel.

## Properties

### attachmentTokenUris?

> `optional` **attachmentTokenUris?**: `string`[]

Optional array of upload token URIs for file attachments. These are the temporary tokens returned by the client file picker (`rootClient.asset.fileUpload()`). In practice, apps rarely use this field since messages with attachments are typically sent directly from the client.

### channelId

> **channelId**: [`ChannelGuid`](ChannelGuid.md)

The ID of the channel where the message will be created. Required.

### content?

> `optional` **content?**: `string`

The text content of the message. Supports Markdown link syntax for mentions (`root://user/`, `root://role/`, `root://channel/`) and community emojis (`root://emoji/`). Optional if attachments are provided.

### needsParentMessageNotification?

> `optional` **needsParentMessageNotification?**: `boolean`

Optional boolean indicating whether to notify the authors of the parent messages. Defaults to false if not specified.

### parentMessageIds?

> `optional` **parentMessageIds?**: [`MessageGuid`](MessageGuid.md)[]

Optional array of message IDs that this message is replying to.