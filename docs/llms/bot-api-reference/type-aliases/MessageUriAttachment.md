---
path: bot-api-reference/type-aliases/MessageUriAttachment.md
audience: bot
category: reference
summary: Metadata for a file attachment referenced in a message.
---

> **MessageUriAttachment** = `object`

Metadata for a file attachment referenced in a message.

## Properties

### fileName

> **fileName**: `string`

The original filename of the attachment, including the extension (e.g., `document.pdf`, `image.png`).

### length

> **length**: `bigint`

The file size in bytes.

### mimeType

> **mimeType**: `string`

The MIME type of the file (e.g., `image/png`, `application/pdf`, `video/mp4`).

### modified?

> `optional` **modified**: `Date`

The timestamp when the file was last modified.