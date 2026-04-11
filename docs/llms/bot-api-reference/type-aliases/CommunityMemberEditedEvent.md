---
path: bot-api-reference/type-aliases/CommunityMemberEditedEvent.md
audience: bot
category: reference
summary: Event payload emitted when a community member's nickname changes.
---

> **CommunityMemberEditedEvent** = `object`

Event payload emitted when a community member's nickname changes. This event only fires for nickname changes; other profile changes (such as profile picture) do not trigger this event.

## Properties

### communityId

> **communityId**: [`CommunityGuid`](CommunityGuid.md)

The unique identifier of the community.

### nickname

> **nickname**: `string`

The member's new nickname.

### userId

> **userId**: [`UserGuid`](UserGuid.md)

The unique identifier of the member whose nickname changed.