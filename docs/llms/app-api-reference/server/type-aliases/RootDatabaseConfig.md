---
path: app-api-reference/server/type-aliases/RootDatabaseConfig.md
audience: app
category: reference
summary: Root-provided configuration for database access. Root automatically creates an instance of `RootDatabaseConfig` for you and exposes it via the...
---

> **Worked sample**: `api-samples/server-database/` — SQLite Database

> **RootDatabaseConfig** = `object`

Root-provided configuration for database access. Root automatically creates an instance of `RootDatabaseConfig` for you and exposes it via the `rootServer.dataStore.config` property.

## Properties

### databaseType

> **databaseType**: `DatabaseType`

Returns the string `sqlite3`.

### sqlite3?

> `optional` **sqlite3**: `object`

Provides the `filename` of your SQLite data file. Here's how you access the filename:

```ts
const sqliteFilename: string = rootServer.dataStore.config.sqlite3!.filename;
```

#### filename

> **filename**: `string`