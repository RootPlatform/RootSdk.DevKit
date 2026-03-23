# How-To: Channels

Create, get, list, move, edit, and delete channels within channel groups.

## Source Files

| File | What it covers |
|------|---------------|
| [channels.ts](src/channels.ts) | Create, get, list, move, edit, delete channels; handle channel events; eventHandlers pattern |

## SDK Methods

- `channels.create(request)` — create a channel in a channel group
- `channels.get(request)` — get a channel by ID
- `channels.list(request)` — list channels in a channel group
- `channels.move(request, eventHandlers?)` — move a channel between groups
- `channels.edit(request, eventHandlers?)` — update a channel's name, description, icon, or permissions
- `channels.delete(request, eventHandlers?)` — delete a channel

## Permissions

```json
{
  "channel": {
    "fullControl": true,
    "createMessage": true
  }
}
```

- `channel.fullControl` — required for create (on the containing group), edit, move (on source and destination groups), and delete
- `channel.createMessage` — only for the `/server-channels` command trigger, not for channel operations

## Events

| Event | Fires when |
|-------|-----------|
| `ChannelEvent.ChannelCreated` | A channel is created |
| `ChannelEvent.ChannelEdited` | A channel's properties or permissions change |
| `ChannelEvent.ChannelDeleted` | A channel is deleted |
| `ChannelEvent.ChannelMoved` | A channel is moved to a different group |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Channel names are restricted** — letters, digits, and hyphens only. No spaces, no leading/trailing/consecutive hyphens. 1-100 characters.
- **Descriptions are optional** — max 256 characters. Whitespace-only values are normalized to undefined.
- **channelType is a raw number** — not an enum. Pass the numeric value directly.
- **list() is scoped to a channel group** — you list channels within a group, not globally.
- **move() requires both group IDs** — `oldChannelGroupId` and `newChannelGroupId` are both required, even when reordering within the same group.
- **beforeChannelId controls ordering** — places the channel before the specified channel within the group.
- **useChannelGroupPermission** — when `true`, the channel inherits permissions from its parent group. When `false`, the channel uses its own permission set.
- **eventHandlers on mutation methods** — `move()`, `edit()`, and `delete()` accept an optional second parameter for handling permission update side effects. These handlers run synchronously before the API call returns and fire for cascading changes to OTHER resources. In this context, "deleted" means "no longer visible to your code" (not necessarily actually deleted). Use `eventHandlers` for side effects of your own operations; use `.on()` subscriptions for changes from any source.
- **accessRuleCreates / accessRuleUpdate** — create and edit support inline access rule changes. See the `access-rules/` how-to for details.
