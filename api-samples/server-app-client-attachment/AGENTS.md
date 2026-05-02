---
kind: api-sample
category: server-lifecycle-utilities
description: Track when members attach to your app — connect/disconnect events for users and devices
domain: Client attachment
key_methods: [list attached clients, send to specific clients]
---

# API Sample: Client Attachment

Track when members attach to your app — connect/disconnect events for users and devices.

## Source Files

| File | What it covers |
|------|---------------|
| [client-attachment.ts](src/client-attachment.ts) | Query attached clients, listen for attach/detach events |

## SDK Methods

- `clients.getClients()` — list all connected users with their device arrays
- `clients.getClient(userId)` — look up a specific connected user
- `clients.getDeviceIds()` — list all connected device IDs
- `clients.on(event, listener)` / `clients.off(event, listener)` — subscribe to connection events

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- No permissions required for client tracking — it is app-scoped introspection
- `channel.createMessage` — only for the `/server-app-client-attachment` command trigger

## Events

- `user.attached` — a user's first device connects
- `user.detached` — a user's last device disconnects
- `user.device.attached` — an additional device connects for an already-connected user
- `user.device.detached` — a device disconnects

## Apps vs Bots

**`rootServer.clients` (`AttachedClients`) is only available in `@rootsdk/server-app`** — it is not part of `@rootsdk/server-bot`.

## Key Behaviors

- **`getClients()` returns only currently connected users** — not all community members. The list changes as users connect and disconnect.
- **`user.attached` fires on first device** — when a user has no active connections and their first device connects.
- **`user.device.attached` fires on subsequent devices** — does NOT fire for the first device (that triggers `user.attached` instead).
- **`user.detached` fires only when the last device disconnects** — if a user has 3 devices and one disconnects, only `user.device.detached` fires. `user.detached` fires when the third and final device disconnects.
- **`Client.deviceIds`** is the full list of connected devices for that user. A `Client` object aggregates all devices.
- **`ClientContext`** (from device events) has a single `deviceId` identifying the specific device. `Client` (from user events) has all `deviceIds`.
