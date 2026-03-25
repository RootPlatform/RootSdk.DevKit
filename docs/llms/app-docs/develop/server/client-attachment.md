---
path: app-docs/develop/server/client-attachment.md
audience: app
category: guide
summary: Track when community members are actively viewing your app.
---

# Client attachment

Track when community members are actively viewing your app.

## What is client attachment?

A *client* represents a community member who has your app's channel open on one of their devices. When a member opens your app's channel, they become *attached*; when they navigate away or disconnect, they become *detached*.

Attachment is per-app. A member attaching to your app does not mean they are attached to other apps in the same community. Each app tracks its own set of attached clients independently.

Attachment is also tracked per-device. A member can have multiple devices attached simultaneously, and the member remains attached as long as at least one device has your app's channel open.

### Desktop behavior

On desktop, a member attaches when they navigate to your app's channel and detaches when they navigate away (to another channel, another app, or another community).

### Mobile behavior

On mobile, a member attaches when they open your app's channel and detaches when they navigate to a different channel or community.

### Example

In the example below, a member has two devices. The desktop is viewing your app's channel. The mobile device is also viewing the same app's channel. Both devices are attached.

[Diagram: Diagram showing how a member with desktop and mobile devices attaches to an app. Both devices have the app's channel open, so both are attached.]
```
flowchart TD
  U[Member]
  U --> D1[Desktop<br/>Viewing: Your App's Channel]
  U --> D2[Mobile<br/>Viewing: Your App's Channel]
  D1 -->|attached| APP((Your App))
  D2 -->|attached| APP
```

### Events

The SDK emits four events to distinguish between user-level and device-level changes:

| Event | When fired |
|-------|------------|
| `ClientEvent.UserAttached` | Member's **first** device attaches (member was not present before) |
| `ClientEvent.UserDetached` | Member's **last** device detaches (member is no longer present) |
| `ClientEvent.UserDeviceAttached` | Member already attached, **another** device joins |
| `ClientEvent.UserDeviceDetached` | Member has multiple devices, **one** leaves (member still attached) |

Use `ClientEvent.UserAttached` and `ClientEvent.UserDetached` when you care about member presence. Use the device events when you need to track individual connections.

## How client attachment works

Understanding the event model helps you choose the right events to subscribe to and predict what your code will receive.

### Attachment lifecycle

When a member opens your app's channel on their first device:

1. The server sends an attach notification
2. The SDK emits `ClientEvent.UserAttached` with a `Client` object
3. The member appears in `attachedClients.getClients()`

When the same member opens your app's channel on a second device:

1. The server sends another attach notification
2. The SDK emits `ClientEvent.UserDeviceAttached` with a `ClientContext` object
3. The member's device count increases (same `Client`, new device)

When one device disconnects but others remain:

1. The server sends a detach notification
2. The SDK emits `ClientEvent.UserDeviceDetached`
3. The member remains in `attachedClients.getClients()`

When the last device disconnects:

1. The server sends a detach notification
2. The SDK emits `ClientEvent.UserDetached`
3. The member is removed from `attachedClients.getClients()`

## When to use client attachment

Use attachment events when your code needs to respond to member presence:

- **Welcome active members**: Show a greeting or trigger an action when a member arrives by subscribing to `ClientEvent.UserAttached`.
- **Track active participants**: Maintain a count of members currently using your app by querying `attachedClients.getClients()`.
- **Clean up on departure**: Release resources or save state when a member leaves by subscribing to `ClientEvent.UserDetached`.
- **Per-device features**: Track individual connections for features like collaborative cursors by using the device events.

If you only need to know who *can* access the community (regardless of whether they're currently viewing it), use `CommunityMemberClient` instead.