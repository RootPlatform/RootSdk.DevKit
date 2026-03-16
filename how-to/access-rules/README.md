# How-To: Access Rules

Create, edit, update (batch), get, delete, and list access rules that grant or deny per-channel permissions to specific roles or members.

## Source Files

| File | What it covers |
|------|---------------|
| [access-rules.ts](src/access-rules.ts) | Create, edit, update (batch), get, delete, list by channel/group, list by role/member; eventHandlers pattern |

## SDK Methods

- `accessRules.create(request, eventHandlers?)` — create an access rule for a role/member on a channel/group
- `accessRules.edit(request, eventHandlers?)` — replace an access rule's overlay permissions
- `accessRules.update(request, eventHandlers?)` — batch create, edit, and delete rules in one call
- `accessRules.get(request)` — get an access rule by composite key
- `accessRules.delete(request, eventHandlers?)` — delete an access rule
- `accessRules.listByChannelOrChannelGroup(request)` — list all rules for a channel or channel group
- `accessRules.listByRoleOrMember(request)` — list all rules for a role or member

## Permissions

```json
{
  "channel": {
    "fullControl": true,
    "createMessage": true
  }
}
```

- `channel.fullControl` — required for create, edit, update, and delete (on the target channel or channel group)
- `channel.createMessage` — only for the `/access-rules` command trigger, not for access rule operations

## Events

Access rules have no dedicated events. Changes surface as channel, channel group, and community permission events — subscribe to those in the `channels/` and `channel-groups/` how-tos.

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Composite key** — an access rule is identified by `(channelOrChannelGroupId, roleOrMemberId)`, not by a single ID.
- **channelOrChannelGroupId** — targets either a single channel or an entire channel group.
- **roleOrMemberId** — targets either a community role or an individual member (person or app).
- **edit() replaces the entire overlay** — not a partial update. To preserve existing permissions, read via get() first and merge.
- **ChannelOverlayPermission fields are optional booleans** — only set fields override the defaults; unset fields inherit from the role/group.
- **update() is a batch operation** — create, edit, and delete multiple rules in a single call.
- **eventHandlers on all mutations** — create, edit, update, and delete all accept eventHandlers. Changing access rules can alter visibility of channels and groups. See the `channels/` how-to for a full explanation of the eventHandlers pattern.
- **No dedicated events** — access rule changes fire channel/channelGroup/community permission events, not access rule events.
