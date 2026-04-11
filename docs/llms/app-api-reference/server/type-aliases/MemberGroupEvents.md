---
path: app-api-reference/server/type-aliases/MemberGroupEvents.md
audience: app
category: reference
summary: Object type with properties: members, members, state, userGroup (Member Groups).
---

> **MemberGroupEvents** = `object`

## Properties

### members.added()

> **members.added**: (`event`: [`MemberGroupMembersAddedEvent`](MemberGroupMembersAddedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupMembersAddedEvent`](MemberGroupMembersAddedEvent.md) |

#### Returns

`void`

### members.removed()

> **members.removed**: (`event`: [`MemberGroupMembersRemovedEvent`](MemberGroupMembersRemovedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupMembersRemovedEvent`](MemberGroupMembersRemovedEvent.md) |

#### Returns

`void`

### state.changed()

> **state.changed**: (`event`: [`MemberGroupStateChangedEvent`](MemberGroupStateChangedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupStateChangedEvent`](MemberGroupStateChangedEvent.md) |

#### Returns

`void`

### userGroup.empty()

> **userGroup.empty**: (`event`: [`MemberGroupEmptiedEvent`](MemberGroupEmptiedEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`MemberGroupEmptiedEvent`](MemberGroupEmptiedEvent.md) |

#### Returns

`void`