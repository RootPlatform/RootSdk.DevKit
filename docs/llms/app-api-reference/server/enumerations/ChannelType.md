---
path: app-api-reference/server/enumerations/ChannelType.md
audience: app
category: reference
summary: Enum defining the types of channels that can be created in a community.
---

Enum defining the types of channels that can be created in a community.

## Enumeration Members

### App

> **App**: `8`

An app channel that hosts a community app. The channel displays the app's UI instead of messages.

### Text

> **Text**: `1`

A standard text channel for posting messages.

### ThreadedText

> **ThreadedText**: `2`

A text channel with threaded conversations.

### Unspecified

> **Unspecified**: `0`

Reserved default value. Do not use in application code.

### Voice

> **Voice**: `4`

A voice channel for real-time audio communication. Members can join to participate in voice chat.