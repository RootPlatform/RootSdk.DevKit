---
path: bot-api-reference/type-aliases/MessageUri.md
audience: bot
category: reference
summary: A URI reference extracted from message content. URIs can reference users, roles, channels, assets, or external URLs.
---

> **MessageUri** = `object`

A URI reference extracted from message content. URIs can reference users, roles, channels, assets, or external URLs.

## Properties

### attachment?

> `optional` **attachment?**: [`MessageUriAttachment`](MessageUriAttachment.md)

Metadata for file attachments. Only present when the URI references an uploaded file (`root://asset/` or `root://upload/` URIs). See `MessageUriAttachment` for the structure.

### uri

> **uri**: `string`

The full URI string. Common formats include:

| Type | Format |
|------|--------|
| User mention | `root://user/{userId}` |
| Role mention | `root://role/{roleId}` |
| Channel mention | `root://channel/{channelId}` |
| `@All` mention | `root://role/All` |
| `@Here` mention | `root://role/Here` |
| Asset | `root://asset/{assetId}` |
| External URL | `https://...` |