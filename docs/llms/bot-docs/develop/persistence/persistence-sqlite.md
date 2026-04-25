---
path: bot-docs/develop/persistence/persistence-sqlite.md
audience: bot
category: guide
summary: Use a **SQLite** database to store your structured data persistently.
---

> **Worked sample**: `api-samples/server-database/` — SQLite Database

# SQLite persistence

Use a **SQLite** database to store your structured data persistently.

Root supports your use of a **SQLite** database:
- Providing the database filename.
- Backing up and restoring the database file automatically so you won't lose data if your server restarts.

## How to use it

You need to add a few dependencies to your `package.json` file:

- Dependency on `sqlite3` to get the database engine into your server code.
- Dependency on your choice of access libraries.

In addition, you use the Root-provided [database filename](../../../bot-api-reference/type-aliases/RootDatabaseConfig.md#filename) at: `rootServer.dataStore.config.sqlite3.filename` in your initialization code. You must use this filename, so Root knows where your data is stored and can do automated backups for you.

## Library options for SQLite access

You can use **any library you prefer** to access SQLite. There are three main types of libraries:

| Category | What it does | Examples |
|---|---|---|
| **Direct libraries** | Execute raw SQL statements yourself. | `sqlite3`, `sqlite` |
| **Query builders** | Build SQL queries programmatically. | `Knex`, `Kysely` |
| **ORMs** | Work with objects; the library generates SQL for you. | `Prisma`, `TypeORM` |

Root recommends you build an upload package early during your development to test how large your preferred database-access library is; some of them add quite a bit of content to your code.

### Example: sqlite3

Here's an example using `sqlite3`. The `sqlite3` library and database engine are packaged together; if you use this library for access, then you don't need to install any additional packages.

```ts
import { rootServer } from '@rootsdk/server-bot';
import { Database } from "sqlite3";

const db = new Database(rootServer.dataStore.config.sqlite3!.filename);

db.serialize(() =>
{
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");
  db.run("INSERT INTO users (name, email) VALUES (?, ?)", ["Bob", "bob@example.com"]);
});

db.close();
```

### Example: Knex

Here's an example using Knex (you'd need to add the Knex package as a dependency in your `package.json`):

```ts
import { rootServer } from '@rootsdk/server-bot';
import Knex from "knex";

const knex = Knex(
{
  client: "sqlite3",
  connection: { filename: rootServer.dataStore.config.sqlite3!.filename },
  useNullAsDefault: true
});

await knex.schema.createTable("users", (table) =>
{
  table.increments("id").primary();
  table.string("name");
  table.string("email");
});

await knex("users").insert({ name: "bob", email: "bob@example.com" });
```
### Example: Sequelize

Here's an example using Sequelize (you'd need to add the Sequelize package as a dependency in your `package.json`):

```ts
import { rootServer } from '@rootsdk/server-bot';
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
{
  dialect: "sqlite",
  storage: rootServer.dataStore.config.sqlite3!.filename
});

const User = sequelize.define("User",
{
  name: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING }
});

await sequelize.sync();
await User.create({ name: "Bob", email: "bob@example.com" });
```

### Example: Sequelize-typescript

Here's an example using Sequelize-typescript (you'd need to add the Sequelize-typescript and Sequelize packages as dependencies in your `package.json`):

```ts
import { rootServer } from '@rootsdk/server-bot';
import { Sequelize } from "sequelize-typescript";
import { Table, Column, Model, DataType } from "sequelize-typescript";

const sequelize = new Sequelize
({
  dialect: "sqlite",
  storage: rootServer.dataStore.config.sqlite3!.filename,
  models: [User]
});

@Table({ tableName: "users" })
class User extends Model
{
  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  email!: string;
}

async function setupDatabase()
{
  await sequelize.sync();
  await User.create({ name: "Alice", email: "alice@example.com" });
}
```