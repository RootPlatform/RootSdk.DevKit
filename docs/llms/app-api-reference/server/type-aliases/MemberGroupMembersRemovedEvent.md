---
path: app-api-reference/server/type-aliases/MemberGroupMembersRemovedEvent.md
audience: app
category: reference
summary: Payload for the `MemberGroupServiceEvent.MembersRemoved` event, emitted when users are removed from a member group.
---

> **MemberGroupMembersRemovedEvent** = `object`

Payload for the `MemberGroupServiceEvent.MembersRemoved` event, emitted when users are removed from a member group.

## Properties

### memberGroup

> **memberGroup**: [`MemberGroup`](MemberGroup.md)

The `MemberGroup` that users were removed from, reflecting its current state after the removal.

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

An array of `UserGuid` values identifying the users that were removed.