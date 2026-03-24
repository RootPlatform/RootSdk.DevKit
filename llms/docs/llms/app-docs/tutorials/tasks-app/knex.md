---
path: app-docs/tutorials/tasks-app/knex.md
audience: app
category: tutorial
summary: In this section, you'll store the tasks in SQLite. Recall that SQLite is built-in to Root and is always available on your server side.
---

# SQLite storage with Knex

In this section, you'll store the tasks in SQLite. Recall that SQLite is built-in to Root and is always available on your server side. Root will even back up and restore your data file automatically as long as you use the filename provided in the Root API.

To avoid writing raw SQL in your code, you'll use Knex to access SQLite. **Knex** is a lightweight SQL query builder for Node.js that lets you interact with relational databases like SQLite, PostgreSQL, and MySQL using TypeScript. It provides a fluent API for building SQL queries, supports migrations for managing schema changes, and works well with or without an ORM. Knex is ideal when you want control over your database logic without using a full-featured ORM.

All your coding in this section will be on the server side; your client and networking code won't change. Here's a table summarizing the new (✨) and updated (⬆️) files you'll be working on:

| Server                     | Networking     | Client     |
|----------------------------|----------------|------------|
| `knexTaskRepository.ts` (new ✨) |  |  |
| `taskService.ts` (update ⬆️) |  |  |
| `main.ts` (update ⬆️) |  |  |
| `package.json` (update ⬆️) |  |  |

## Code `server/src/knexTaskRepository.ts`

1. Create a new file named `knexTaskRepository.ts` in the `server/src` folder.

1. Add the following code to the file:

```ts
import Knex from "knex";

// TODO import rootServer

const knex = Knex({
  client: "sqlite3",
  connection: { filename: /* TODO: replace this comment with the Root-provided SQLite file name */ },
  useNullAsDefault: true,
});

export interface TaskModel {
  id: number;
  text: string;
}

const taskTableName: string = "tasks";

export class KnexTaskRepository {
  public async create(text: string): Promise<TaskModel> {
    const [id] = await knex(taskTableName).insert({ text });

    return await knex(taskTableName).where({ id }).first() as TaskModel;
  }

  public async list(): Promise<TaskModel[]> {
    return await knex(taskTableName).select() as TaskModel[];
  }

  public async delete(id: number): Promise<number> {
    return await knex(taskTableName).where({ id }).del();
  }
}

export async function initializeKnex() {
  const hasTable = await knex.schema.hasTable(taskTableName);

  if (!hasTable) {
    await knex.schema.createTable(taskTableName, (table) => {
      table.increments("id").primary();
      table.text("text");
    });
  }
}

export const taskRepository = new KnexTaskRepository();
```

1. Replace the first `TODO` comment with an import statement for `rootServer` from `@rootsdk/server-app`.
	
	**Show code**

	```ts
	import { rootServer } from "@rootsdk/server-app";
	```
	

1. Replace the second `TODO` comment with the SQLite filename that Root provides: `rootServer.dataStore.config.sqlite3!.filename`.
	
	**Show code**

	```ts
	const knex = Knex({
	  client: "sqlite3",
	  connection: { filename: rootServer.dataStore.config.sqlite3!.filename },
	  useNullAsDefault: true,
	});
	```
	

## Update `server/src/taskService.ts`

Next, update your existing task service to use the Knex repository instead of the in-memory repository. This is trivial because the code was careful to name the types and methods the same in the two implementations.

1. Open the file `server/src/taskService.ts`.

1. Comment out the following import statement (the one for the in-memory repository):
	```ts
	import { taskRepository, TaskModel } from "./memoryTaskRepository";
	```

1. Add the following import statement (for the Knex repository):
	```ts
	import { taskRepository, TaskModel } from "./knexTaskRepository";
	```

## Update `server/src/main.ts`

1. Call the `initializeKnex` function from `main.ts`.
	
	**Show code**

	```ts
	import { rootServer, RootAppStartState } from "@rootsdk/server-app";
	import { taskService } from "./taskService";
	import { initializeKnex } from "./knexTaskRepository";

	async function onStarting(state: RootAppStartState) {
	  await initializeKnex();

	  rootServer.lifecycle.addService(taskService);
	}

	(async () => {
	  await rootServer.lifecycle.start(onStarting);
	})();
	```
	

## Update `server/package.json`

You need to pull in packages for Knex and the underlying SQLite database driver that Knex uses.

1. Open `server/package.json`.

1. Add the following lines to the file:
	```ts
	"dependencies": {
	  "sqlite3": "^5.1.7",
	  "knex": "^3.1.0"
	},
	```

## Test

1. Open a terminal in your App's project folder.

1. Install the new packages by running the following command:
	```bash
	npm i
	```

1. Build the App by running the following command:
	```bash
	npm run build
	```

1. Open a terminal in your App's `server` folder.

1. Execute the server side of your App by running the following command:
	```bash
	npm run server
	```

1. Open a terminal in your App's `client` folder.

1. Run the following command:
	```bash
	npm run client
	```

1. Add a task.

1. Shut down the server and client and then run both again. Your previous task has been preserved.

1. Notice the file in your App's project folder named `rootsdk.sqlite3`. That's the file where your tasks are stored. If you want to reset your database, you can simply delete this file.