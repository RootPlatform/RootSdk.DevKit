---
path: bot-api-reference/type-aliases/MessageReferenceMapUser.md
audience: bot
category: reference
summary: A resolved user mention containing the user ID and their current display name.
---

> **MessageReferenceMapUser** = `object`

A resolved user mention containing the user ID and their current display name.

## Properties

### name

> **name**: `string`

The current display name of the user. This value is resolved when the message is retrieved, so it reflects the user's current name, not the name at the time the message was sent.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the mentioned user.