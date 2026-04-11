---
path: app-api-reference/server/type-aliases/RootAppStartState.md
audience: app
category: reference
summary: Snapshot of the community's current state, passed to your `AppStartingCallback` during app server startup.
---

> **RootAppStartState** = `RootBotStartState` & `object`

Snapshot of the community's current state, passed to your `AppStartingCallback` during app server startup. Use this to initialize your app's in-memory state without making API calls.

## Type Declaration

### channelId

> `readonly` **channelId**: [`ChannelGuid`](ChannelGuid.md)

The GUID of the channel assigned to this app.