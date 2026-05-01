---
kind: api-sample
category: server-community-api
description: Get and edit the community — the top-level entity, one per app/bot installation
domain: Community info
key_methods: [get community details, update settings]
---

# API Sample: Community

Get and edit the community. The community is the top-level entity — one per app/bot installation.

## Source Files

| File | What it covers |
|------|---------------|
| [community.ts](src/community.ts) | Both community methods + 3 events |

## SDK Methods

- `communities.get()` — get the community (no parameters needed)
- `communities.edit(request)` — edit the community (full replacement, not partial patch)

## Permissions

```json
{
  "community": {
    "manageCommunity": true
  },
  "channel": {
    "createMessage": true
  }
}
```

- `community.manageCommunity` — required for edit
- _(no permission needed for get)_
- `channel.createMessage` — only for the `/server-community` command trigger

## Events

- `CommunityEvent.CommunityEdited` — community settings changed
- `CommunityEvent.CommunityJoined` — a user joined the community
- `CommunityEvent.CommunityLeave` — a user left or was kicked from the community

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **get() takes zero parameters** — unique among all SDK methods. Returns the bot's/app's community.
- **edit() is a full replacement** — all fields are required. Omitting a field resets it to its default, not "no change".
- **updatePicture gate** — set `updatePicture: false` to leave the picture unchanged. Set `true` + provide `pictureTokenUri` to change it.
- **pictureTokenUri requires asset upload** — `rootServer.dataStore.assets.create()` is only available in `server-app` (not `server-bot`). Bots cannot change the community picture.
- **CommunityLeaveReason enum** — `Unspecified = 0`, `User = 1` (voluntary), `Kicked = 4` (removed by admin). Note the gap (no 2 or 3).
- **Events fire after subscription only** — there is no replay of historical events. The bot/app is already a community member when `onStarting` runs, so its own join event is never received. No filtering of existing members is needed.
- **CommunityJoinedEvent includes roles** — `communityRoleIds?` shows which roles were auto-assigned on join.
- **Identify bots vs humans** — `RootGuidUtils.toRootGuidType(userId)` returns `RootGuidType.App` for bots/apps and `RootGuidType.Person` for humans. Use this in `CommunityJoined` handlers to skip bot joins (see `onCommunityJoined` in source).
- **Returns full Community on edit** — unlike some edit methods that return partial responses, `edit()` returns the complete entity.
