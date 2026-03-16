# How-To: Directories

Create, get, list, edit (rename), move, and delete directories within channels. Directories organize files in a hierarchical tree.

## Source Files

| File | What it covers |
|------|---------------|
| [directories.ts](src/directories.ts) | All 6 directory methods + 4 events |

## SDK Methods

- `channelDirectories.create(request)` — create a directory (root-level or nested via parentDirectoryId)
- `channelDirectories.get(request)` — get a directory by ID
- `channelDirectories.list(request)` — list all directories in a channel (flat, not tree)
- `channelDirectories.edit(request)` — rename a directory (name is the only mutable field)
- `channelDirectories.move(request)` — move a directory to a different parent
- `channelDirectories.delete(request)` — delete a directory

## Permissions

```json
{
  "channel": {
    "createFile": true,
    "viewFile": true,
    "manageFiles": true,
    "createMessage": true
  }
}
```

- `channel.createFile` — required for create
- `channel.viewFile` — required for get, list
- `channel.manageFiles` — required for edit, move, delete
- `channel.createMessage` — only for the `/directories` command trigger

## Events

- `ChannelDirectoryEvent.ChannelDirectoryCreated` — directory created
- `ChannelDirectoryEvent.ChannelDirectoryEdited` — directory renamed
- `ChannelDirectoryEvent.ChannelDirectoryDeleted` — directory deleted
- `ChannelDirectoryEvent.ChannelDirectoryMoved` — directory moved to a different parent

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Hierarchical nesting** — `parentDirectoryId` makes directories a tree. Omit it to create a root-level directory; pass a `DirectoryGuid` to nest.
- **list() returns a flat array** — all directories in the channel, not a tree. To reconstruct the hierarchy, group by `parentDirectoryId`.
- **edit() is rename-only** — the only mutable field is `name`. Use `move()` to change the parent.
- **move() uses oldParentDirectoryId + newParentDirectoryId** — same pattern as file move and channel move.
- **Every request requires channelId** — directories are always scoped to a channel.
- **get/delete only need channelId + id** — simpler than file requests which also require directoryId.
- **Minimal entity** — just `id`, `parentDirectoryId?`, `name`. No timestamps or metadata.
- **No search** — unlike files, directories have no search or searchCommunity methods.
- **No eventHandlers** — directory methods do not accept an `eventHandlers` parameter. Use `.on()` only.
