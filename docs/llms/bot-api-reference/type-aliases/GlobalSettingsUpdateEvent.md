---
path: bot-api-reference/type-aliases/GlobalSettingsUpdateEvent.md
audience: bot
category: reference
summary: Event payload delivered when a community member changes any global setting value.
---

> **GlobalSettingsUpdateEvent** = `object`

Event payload delivered when a community member changes any global setting value.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community where the setting was changed.

### current

> **current**: [`GlobalSettings`](GlobalSettings.md)

The `GlobalSettings` state after the change.

### previous

> **previous**: [`GlobalSettings`](GlobalSettings.md)

The `GlobalSettings` state before the change. Use this to compare old and new values.