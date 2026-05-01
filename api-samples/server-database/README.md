---
kind: api-sample
category: server-persistence-scheduling
description: Access the platform-provided SQLite database for persistent storage
domain: SQLite database
key_methods: [raw SQL, migrations, Knex, Prisma]
---

# API Sample: SQLite Database

Access the platform-provided SQLite database for persistent storage.

## Source Files

| File | What it covers |
|------|---------------|
| [database.ts](src/database.ts) | Get config, get path, open connection, basic CRUD |

## SDK Methods

- `dataStore.config.databaseType` — the database engine type (currently always `"sqlite3"`)
- `dataStore.config.sqlite3.filename` — the file path to the SQLite database

## Permissions

```json
{}
```

No special permissions required. The database config is always available to your code.

The `channel.createMessage` permission in `root-manifest.json` is only for the `/server-database` command trigger, not for database access itself.

## Events

None. The database does not emit real-time events.

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **No permissions required** — the database config is always available.
- **No events** — changes are not broadcast.
- **`sqlite3` is optional in the type** — use `!` or a guard check. It is always present at runtime.
- **Platform-managed file** — Root backs up and restores this database file. Use the provided path. If you create a separate database file, it won't be included in backups.
- **Coexists with the KV store** — `dataStore.appData` (the key-value store) uses this same database. Both work side by side.
- **Use any SQLite library** — the SDK gives you a file path. Use sqlite3, better-sqlite3, knex, prisma, or any library that accepts a filename.
