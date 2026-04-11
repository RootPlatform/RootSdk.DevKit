---
path: app-api-reference/server/type-aliases/GlobalSettingButtonEvent.md
audience: app
category: reference
summary: Event payload delivered when a community member presses a `button` setting.
---

> **GlobalSettingButtonEvent** = `object`

Event payload delivered when a community member presses a `button` setting.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community where the button was pressed.

### key

> **key**: `string`

The full key identifying which button was pressed, in the format `groupKey.itemKey`.