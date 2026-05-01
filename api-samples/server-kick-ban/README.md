---
kind: api-sample
category: server-community-api
description: Ban, unban, kick, and query banned community members
domain: Moderation
key_methods: [kick, ban, unban, list bans]
---

# API Sample: Kick & Ban

Ban, unban, kick, and query banned community members.

## Source Files

| File | What it covers |
|------|---------------|
| [kick-ban.ts](src/kick-ban.ts) | Ban, unban, kick, get ban, list bans; handle ban events |

## SDK Methods

- `communityMemberBans.create(request)` — ban a user (removes from community, creates persistent record)
- `communityMemberBans.delete(request)` — unban a user (removes ban record)
- `communityMemberBans.kick(request)` — kick a user (removes from community, no ban record)
- `communityMemberBans.list()` — list all active bans
- `communityMemberBans.get(request)` — get a ban record by userId

## Permissions

```json
{
  "community": {
    "createBan": true,
    "manageBans": true,
    "kick": true
  },
  "channel": {
    "createMessage": true
  }
}
```

- `community.createBan` — required for ban (create)
- `community.manageBans` — required for unban (delete), get, and list
- `community.kick` — required for kick
- `channel.createMessage` — only for the `/server-kick-ban` command trigger

## Events

| Event | Fires when |
|-------|-----------
| `CommunityMemberBanEvent.CommunityMemberBanCreated` | A user is banned |
| `CommunityMemberBanEvent.CommunityMemberBanDeleted` | A ban is removed (unbanned) |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Ban vs kick** — banning creates a persistent record that prevents rejoining. Kicking removes the user but they can rejoin immediately via invite.
- **Unban does NOT re-add** — `delete()` removes the ban record but does not automatically bring the user back. They must rejoin via invite.
- **Cannot ban/kick owner or apps** — the community owner and app users are protected.
- **Ban reason** — optional string, max 256 characters.
- **Temporary bans** — set `expiresAt` for bans that automatically expire. After expiry the user can rejoin.
- **No kick event** — kicks are fire-and-forget. Only bans have dedicated events.
- **Three different permissions** — ban, unban/query, and kick each require distinct permissions.
- **agentUserId on ban record** — tracks who performed the ban.
