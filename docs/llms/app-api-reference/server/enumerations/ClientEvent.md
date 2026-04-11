---
path: app-api-reference/server/enumerations/ClientEvent.md
audience: app
category: reference
summary: Enum providing string constants for client attachment event names. Use these values when subscribing to events on `AttachedClients`.
---

Enum providing string constants for client attachment event names. Use these values when subscribing to events on `AttachedClients`.

## Enumeration Members

### UserAttached

> **UserAttached**: `"user.attached"`

Emitted when a member's first device opens your app's channel. Use this to detect when a member becomes present. The callback receives a `Client` object.

### UserDetached

> **UserDetached**: `"user.detached"`

Emitted when a member's last device navigates away from your app's channel. Use this to detect when a member is no longer present. The callback receives a `Client` object.

### UserDeviceAttached

> **UserDeviceAttached**: `"user.device.attached"`

Emitted when an additional device attaches for a member who is already present. The member was already attached via another device. The callback receives a `ClientContext` object.

### UserDeviceDetached

> **UserDeviceDetached**: `"user.device.detached"`

Emitted when one device detaches but the member remains attached via other devices. The callback receives a `ClientContext` object.