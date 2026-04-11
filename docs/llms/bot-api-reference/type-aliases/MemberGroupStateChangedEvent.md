---
path: bot-api-reference/type-aliases/MemberGroupStateChangedEvent.md
audience: bot
category: reference
summary: Payload for the `MemberGroupServiceEvent.StateChanged` event, emitted when a member group's community role list changes.
---

> **MemberGroupStateChangedEvent** = `object`

Payload for the `MemberGroupServiceEvent.StateChanged` event, emitted when a member group's community role list changes.

## Properties

### memberGroup

> **memberGroup**: [`MemberGroup`](MemberGroup.md)

The `MemberGroup` whose state changed, reflecting its current state.