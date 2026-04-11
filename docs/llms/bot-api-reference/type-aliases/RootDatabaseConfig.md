---
path: bot-api-reference/type-aliases/RootDatabaseConfig.md
audience: bot
category: reference
summary: Root-provided configuration for database access. Root automatically creates an instance of `RootDatabaseConfig` for you and exposes it via the...
---

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