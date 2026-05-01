---
kind: api-sample
category: server-community-api
description: Get, list, and list all community members — read-only; members join via invites and leave via kick/ban
domain: Members
key_methods: [get, list, listAll]
---

# API Sample: Members

Get, list, and list all community members. Read-only — members join via invites and leave via kick/ban.

## Source Files

| File | What it covers |
|------|---------------|
| [members.ts](src/members.ts) | Get, list, list all members; presence and profile events |

## SDK Methods

- `communityMembers.get(request)` — get a single member by userId
- `communityMembers.list(request)` — get specific members by an array of userIds
- `communityMembers.listAll()` — get all members in the community

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- No permissions required for any member query operation
- `channel.createMessage` — only for the `/server-members` command trigger

## Events

| Event | Fires when |
|-------|-----------
| `CommunityMemberEvent.UserSetProfile` | Any user updates their profile (username, picture) |
| `CommunityMemberEvent.CommunityMemberAttach` | A member's WebSocket connects to the community |
| `CommunityMemberEvent.CommunityMemberDetach` | A member's WebSocket disconnects from the community |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Read-only client** — no create, edit, or delete operations. Members join via invites and leave via kick/ban.
- **list() silently filters** — non-existent userIds are dropped, not errored. The returned array may be shorter than the input.
- **listAll() includes everyone** — returns regular members, app users, and the community owner.
- **list() requires at least one userId** — empty array triggers a validation error.
- **CommunityMember fields** — userId, nickname, profilePictureAssetUri, communityRoleIds, roleColorHex, primaryCommunityRoleId, primaryCommunityRoleName, subscribedAt. Optional fields may be undefined.
- **UserSetProfile is global** — fires for any user profile change, not scoped to the community.
- **Attach/Detach track presence** — use these to know when members come online or go offline.
