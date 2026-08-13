---
path: app-api-reference/server/type-aliases/DeviceContext.md
audience: app
category: reference
summary: Identifies a specific device connection. Base type extended by `Client` and `ClientContext`.
---

> **DeviceContext** = `object`

Identifies a specific device connection. Base type extended by `Client` and `ClientContext`.

## Properties

### deviceId?

> `optional` **deviceId?**: [`DeviceGuid`](DeviceGuid.md)

The device's unique identifier. Members can be attached on multiple devices simultaneously (for example, desktop and mobile), and each device has its own ID.

On `Client` objects, this property identifies the device that triggered an attachment event. It is only populated on `Client` objects received through `ClientEvent.UserAttached` and `ClientEvent.UserDetached` callbacks. `Client` objects returned from `AttachedClients.getClients()` and `AttachedClients.getClient()` have this set to `undefined`. To get all of a member's connected devices, use `Client.deviceIds` instead.

On `ClientContext` objects received through `ClientEvent.UserDeviceAttached` and `ClientEvent.UserDeviceDetached`, this property is always populated.