---
path: bot-api-reference/type-aliases/DeviceGuid.md
audience: bot
category: reference
summary: Identifies a user's device. Branded with `RootGuidType.Desktop` or `RootGuidType.Mobile`.
---

> **DeviceGuid** = `string` & `object`

Identifies a user's device. Branded with `RootGuidType.Desktop` or `RootGuidType.Mobile`. Appears in WebRTC and presence events to distinguish between a user's connected devices.

## Type Declaration

### __rootGuidType

> **__rootGuidType**: [`Desktop`](../enumerations/RootGuidType.md#desktop) | [`Mobile`](../enumerations/RootGuidType.md#mobile)