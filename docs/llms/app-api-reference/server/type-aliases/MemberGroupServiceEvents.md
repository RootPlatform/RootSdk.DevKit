---
path: app-api-reference/server/type-aliases/MemberGroupServiceEvents.md
audience: app
category: reference
summary: Object type with properties: members, members, state, userGroup (Member Groups).
---

> **MemberGroupServiceEvents** = `object`

## Properties

### members.added()

> **members.added**: (`event`: `MemberGroupMembersAddedEvent`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `MemberGroupMembersAddedEvent` |

#### Returns

`void`

### members.removed()

> **members.removed**: (`event`: `MemberGroupMembersRemovedEvent`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `MemberGroupMembersRemovedEvent` |

#### Returns

`void`

### state.changed()

> **state.changed**: (`event`: `MemberGroupStateChangedEvent`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `MemberGroupStateChangedEvent` |

#### Returns

`void`

### userGroup.empty()

> **userGroup.empty**: (`event`: `MemberGroupEmptiedEvent`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `MemberGroupEmptiedEvent` |

#### Returns

`void`