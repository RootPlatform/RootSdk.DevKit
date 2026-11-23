---
path: bot-api-reference/type-aliases/MemberGroupEvents.md
audience: bot
category: reference
summary: Event map type for `rootServer.memberGroups`. This type defines the event signatures for member group events.
---

> **MemberGroupEvents** = `object`

Event map type for `rootServer.memberGroups`. This type defines the event signatures for member group events.

For event name constants, see `MemberGroupEvent`.

## Properties

### members.added

> **members.added**: (`event`: [`MemberGroupMembersAddedEvent`](MemberGroupMembersAddedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupMembersAddedEvent`](MemberGroupMembersAddedEvent.md) |

#### Returns

`void`

### members.removed

> **members.removed**: (`event`: [`MemberGroupMembersRemovedEvent`](MemberGroupMembersRemovedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupMembersRemovedEvent`](MemberGroupMembersRemovedEvent.md) |

#### Returns

`void`

### state.changed

> **state.changed**: (`event`: [`MemberGroupStateChangedEvent`](MemberGroupStateChangedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupStateChangedEvent`](MemberGroupStateChangedEvent.md) |

#### Returns

`void`

### userGroup.empty

> **userGroup.empty**: (`event`: [`MemberGroupEmptiedEvent`](MemberGroupEmptiedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupEmptiedEvent`](MemberGroupEmptiedEvent.md) |

#### Returns

`void`