# How-To: Channel Groups

Create, get, list, edit, move, and delete channel groups that organize channels.

## Source Files

| File | What it covers |
|------|---------------|
| [channel-groups.ts](src/channel-groups.ts) | Create, get, list, edit, move, delete channel groups; handle channel group events; eventHandlers pattern |

## SDK Methods

- `channelGroups.create(request)` — create a channel group
- `channelGroups.get(request)` — get a channel group by ID
- `channelGroups.list()` — list all channel groups in the community
- `channelGroups.edit(request, eventHandlers?)` — update a channel group's name or access rules
- `channelGroups.move(request)` — reorder a channel group
- `channelGroups.delete(request)` — delete a channel group and all its channels

## Permissions

```json
{
  "community": {
    "createChannelGroup": true
  },
  "channel": {
    "fullControl": true,
    "createMessage": true
  }
}
```

- `community.createChannelGroup` — required for create
- `channel.fullControl` — required for edit, move, and delete (on the group); delete also requires fullControl on all contained channels
- `channel.createMessage` — only for the `/server-channel-groups` command trigger, not for channel group operations

## Events

| Event | Fires when |
|-------|-----------|
| `ChannelGroupEvent.ChannelGroupCreated` | A channel group is created |
| `ChannelGroupEvent.ChannelGroupEdited` | A channel group's properties or permissions change |
| `ChannelGroupEvent.ChannelGroupDeleted` | A channel group is deleted |
| `ChannelGroupEvent.ChannelGroupMoved` | A channel group is reordered |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Group names differ from channel names** — groups allow spaces and apostrophes but not hyphens. 1-100 characters.
- **list() is global** — returns all channel groups in the community with no parameters.
- **delete() cascades** — deleting a group deletes all channels within it. Requires fullControl on the group AND all contained channels.
- **beforeChannelGroupId controls ordering** — on move, places the group before the specified group. Omit to move to the end.
- **eventHandlers on edit()** — the only channel group method that accepts eventHandlers. Editing access rules can cause groups to gain or lose visibility. In this context, "created"/"deleted" mean visibility changes, not actual creation/deletion. See the `channels/` how-to for a full explanation of the eventHandlers pattern.
- **accessRuleCreates / accessRuleUpdate** — create and edit support inline access rule changes. See the `access-rules/` how-to for details.
