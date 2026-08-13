---
path: app-api-reference/server/type-aliases/GlobalSettingsEvents.md
audience: app
category: reference
summary: Event map type for `GlobalSettings`. This type defines the event signatures for global settings events.
---

> **GlobalSettingsEvents** = `object`

Event map type for `GlobalSettings`. This type defines the event signatures for global settings events.

## Properties

### button

> **button**: (`event`: [`GlobalSettingButtonEvent`](GlobalSettingButtonEvent.md)) => `void`

Emitted when a community member presses a `button` setting. The listener receives a `GlobalSettingButtonEvent` identifying which button was pressed.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`GlobalSettingButtonEvent`](GlobalSettingButtonEvent.md) |

#### Returns

`void`

### update

> **update**: (`event`: [`GlobalSettingsUpdateEvent`](GlobalSettingsUpdateEvent.md)) => `void`

Emitted when a community member changes any setting value. The listener receives a `GlobalSettingsUpdateEvent` with both the previous and current settings.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`GlobalSettingsUpdateEvent`](GlobalSettingsUpdateEvent.md) |

#### Returns

`void`