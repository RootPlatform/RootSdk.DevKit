---
path: bot-api-reference/enumerations/MessageDirectionTake.md
audience: bot
category: reference
summary: Controls the direction of message pagination when listing messages with `ChannelMessageClient.list()`.
---

Controls the direction of message pagination when listing messages with `ChannelMessageClient.list()`. Used together with `dateAt` (a reference timestamp) and `limit` (maximum number of messages to return) on `ChannelMessageListRequest`.

## Enumeration Members

### Both

> **Both**: `3`

Return messages in both directions from `dateAt`, splitting the limit between newer and older results. Use when jumping to a specific point in message history and displaying context above and below it.

### Newer

> **Newer**: `1`

Return messages created after `dateAt`, ordered from oldest to newest. Use when loading newer messages as the user scrolls up from a known position.

### Older

> **Older**: `2`

Return messages created before `dateAt`, ordered from newest to oldest. Use when loading message history as the user scrolls down from a known position.

### Unspecified

> **Unspecified**: `0`

Reserved default value. Do not use in application code.