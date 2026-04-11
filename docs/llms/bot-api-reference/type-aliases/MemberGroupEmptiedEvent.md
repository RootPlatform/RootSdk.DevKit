---
path: bot-api-reference/type-aliases/MemberGroupEmptiedEvent.md
audience: bot
category: reference
summary: Payload for the `MemberGroupServiceEvent.UserGroupEmptied` event, emitted when a member group's resolved membership becomes empty.
---

> **MemberGroupEmptiedEvent** = `object`

Payload for the `MemberGroupServiceEvent.UserGroupEmptied` event, emitted when a member group's resolved membership becomes empty.

## Properties

### memberGroup

> **memberGroup**: [`MemberGroup`](MemberGroup.md)

The `MemberGroup` that became empty. Its `memberUserIds` array is now empty.