---
path: app-api-reference/server/type-aliases/GlobalSettingButtonEvent.md
audience: app
category: reference
summary: Payload type for the `button` event. Root does not support the `button` setting type, so this event is never emitted.
---

> **GlobalSettingButtonEvent** = `object`

Payload type for the `button` event. Root does not support the `button` setting type, so this event is never emitted.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The ID of the community the event would refer to.

### key

> **key**: `string`

The full key of the `button` setting, in the format `groupKey.itemKey`.