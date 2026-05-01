---
kind: api-sample
category: server-community-api
description: Create, get, list, edit (rename), move, delete, and search files within channel directories, including community-wide search
domain: Channel files
key_methods: [upload, get, list, delete]
---

# API Sample: Files

Create, get, list, edit (rename), move, delete, search, and search across the community for files within channel directories.

## Source Files

| File | What it covers |
|------|---------------|
| [files.ts](src/files.ts) | All 8 file methods + 4 events |

## SDK Methods

- `channelFiles.create(request)` — upload a file to a directory (requires uploadTokenUri from the platform upload endpoint)
- `channelFiles.get(request)` — get a file by ID
- `channelFiles.list(request)` — list files in a directory
- `channelFiles.edit(request)` — rename a file (name is the only mutable field)
- `channelFiles.move(request)` — move a file between directories
- `channelFiles.delete(request)` — delete a file
- `channelFiles.search(request)` — search files within a channel (supports pagination via lastFileId)
- `channelFiles.searchCommunity(request)` — search files across multiple channels (results grouped by channel)

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
- `channel.viewFile` — required for get, list, search, searchCommunity
- `channel.manageFiles` — required for edit, move, delete
- `channel.createMessage` — only for the `/server-files` command trigger

## Events

- `ChannelFileEvent.ChannelFileCreated` — file uploaded (includes mimeType, which the entity type does not)
- `ChannelFileEvent.ChannelFileEdited` — file renamed
- `ChannelFileEvent.ChannelFileDeleted` — file deleted
- `ChannelFileEvent.ChannelFileMoved` — file moved between directories

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **uploadTokenUri dependency** — `create()` requires a raw upload token from the platform's asset upload endpoint. Upload tokens are temporary and should be used promptly, not stored.
- **Every request requires channelId** — files are always scoped to a channel.
- **Most requests require directoryId** — get, list, edit, delete all need it. Only search and searchCommunity skip it.
- **edit() is rename-only** — the only mutable field is `name`. Use `move()` to change directories.
- **move() requires oldDirectoryId + newDirectoryId** — same pattern as channel move.
- **search() pagination** — pass `lastFileId` to get the next page of results.
- **searchCommunity() groups results** — response contains `results[]`, each with `channelId`, `files[]`, and `totalCount`.
- **length is bigint** — file size, not a regular number.
- **sha256 is Uint8Array** — binary hash, not a hex string.
- **mimeType only on created event** — `ChannelFileCreatedEvent` includes `mimeType`, but the `ChannelFile` entity does not.
- **list() is not recursive** — returns files in a single directory. List directories first, then list files in each.
- **No eventHandlers** — unlike channels/access-rules, file methods do not accept an `eventHandlers` parameter.
