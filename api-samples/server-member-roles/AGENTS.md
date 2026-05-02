---
kind: api-sample
category: server-community-api
description: Add, list, remove, and set primary roles on community members
domain: Member roles
key_methods: [assign, remove, list roles for member]
---

# API Sample: Member Roles

Add, list, remove, and set primary roles on community members.

## Source Files

| File | What it covers |
|------|---------------|
| [member-roles.ts](src/member-roles.ts) | Add, list, remove, set primary role; handle member role events |

## SDK Methods

- `communityMemberRoles.add(request)` — assign a role to one or more users
- `communityMemberRoles.list(request)` — list all roles for a specific user
- `communityMemberRoles.remove(request)` — unassign a role from one or more users
- `communityMemberRoles.setPrimary(request)` — set a role as a user's primary role

## Permissions

```json
{
  "community": {
    "manageRoles": true
  },
  "channel": {
    "createMessage": true
  }
}
```

- `community.manageRoles` — required for add, remove, and setPrimary
- `channel.createMessage` — only for the `/server-member-roles` command trigger, not for member role operations

## Events

| Event | Fires when |
|-------|-----------
| `CommunityMemberRoleEvent.CommunityMemberRoleCreated` | A role is assigned to user(s) |
| `CommunityMemberRoleEvent.CommunityMemberRoleDeleted` | A role is unassigned from user(s) |
| `CommunityMemberRoleEvent.CommunityMemberRoleSetPrimary` | A user's primary role changes |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **add() is all-or-nothing** — if any userId is not a community member, the entire request fails. No partial success.
- **remove() is forgiving** — silently skips users who don't have the role. No error.
- **userIds must be non-empty** — at least one userId is required for add() and remove().
- **list() always includes the EveryoneRole** — every member implicitly has it. It cannot be added, removed, or set as primary.
- **setPrimary() moves the role to index [0]** — the primary role appears first in the communityRoleIds array returned by list(). The user must already have the role assigned.
- **No edit operation** — member roles are add/remove only. Use combinations (add both, then setPrimary) for complex changes.
- **Roles are defined separately** — see the `roles/` api sample for creating and managing role definitions.
