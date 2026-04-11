---
path: bot-api-reference/type-aliases/MemberGroupMembersAddedEvent.md
audience: bot
category: reference
summary: Payload for the `MemberGroupServiceEvent.MembersAdded` event, emitted when users are added to a member group.
---

> **MemberGroupMembersAddedEvent** = `object`

Payload for the `MemberGroupServiceEvent.MembersAdded` event, emitted when users are added to a member group.

## Properties

### memberGroup

> **memberGroup**: [`MemberGroup`](MemberGroup.md)

The `MemberGroup` that users were added to, reflecting its current state after the addition.

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

An array of `UserGuid` values identifying the users that were added.