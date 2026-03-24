---
path: bot-api-reference/type-aliases/ParentMessage.md
audience: bot
category: reference
summary: Represents a message that another message is replying to.
---

> **ParentMessage** = `object`

Represents a message that another message is replying to.

## Properties

### id

> **id**: [`MessageGuid`](MessageGuid.md)

The unique identifier of the parent message.

### messageContent?

> `optional` **messageContent**: `string`

The text content of the parent message. Optional if the content is no longer available.

### userId?

> `optional` **userId**: [`UserGuid`](UserGuid.md)

The ID of the user who created the parent message. Optional if the user is no longer available.