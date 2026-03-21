# How-To: Clients (App)

Track connected users and devices in real time.

## Source Files

| File | What it covers |
|------|---------------|
| [clients-app.ts](src/clients-app.ts) | Query connected clients, listen for connection events |

## SDK Methods

- `clients.getClients(communityId?)` — list all connected users with their device arrays
- `clients.getClient(userId, communityId?)` — look up a specific connected user
- `clients.getDeviceIds(communityId?)` — list all connected device IDs
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
- `channel.createMessage` — only for the `/clients-app` command trigger

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
- **Pass `communityId`** to filter queries to a specific community. When omitted, `getClient()` uses the app's default community.
