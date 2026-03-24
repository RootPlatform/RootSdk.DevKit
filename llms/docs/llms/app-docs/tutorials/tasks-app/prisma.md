---
path: app-docs/tutorials/tasks-app/prisma.md
audience: app
category: tutorial
summary: In this section, you'll use Prisma to store tasks in SQLite. **Prisma** is a TypeScript ORM for Node.js that simplifies database access by providing...
---

# SQLite storage with Prisma

In this section, you'll use Prisma to store tasks in SQLite. **Prisma** is a TypeScript ORM for Node.js that simplifies database access by providing a type-safe and auto-generated query builder. It works with relational databases like PostgreSQL, MySQL, and SQLite. Prisma uses a schema file to define your data models, and it generates a client you can use to perform queries with full IntelliSense support. It also includes tools for migrations, seeding, and database introspection, making it good for developers who want strong typing, productivity, and maintainability.

All your coding in this section will be on the server side; your client and networking code won't change. Here's a table summarizing the new (✨) and updated (⬆️) files you'll be working on:

| Server                     | Networking     | Client     |
|----------------------------|----------------|------------|
| `schema.prisma` (new ✨) |  |  |
| `package.json` (update ⬆️) |  |  |
| `prismaTaskRepository.ts` (new ✨) |  |  |
| `taskService.ts` (update ⬆️) |  |  |
| `main.ts` (update ⬆️) |  |  |

## Code `server/schema.prisma`

The `schema.prisma` file is the core configuration file for Prisma:
- `generator` block: Tells Prisma what kind of client code to generate. 
- `model` block(s): Each model in the file maps to a table in your database, with fields representing columns.
- `datasource` block: Specifies the database type and connection URL. It usually contains the exact name of the database file; however, the required database filename in Root isn't available until runtime. To get around this, the schema file will specify an environment variable that you'll set to the Root filename in a later step.

1. Create a new file named `schema.prisma` in the `server` folder.

1. Add the following code to the file:

```json
generator client {
  provider = "prisma-client-js"    // You want a JavaScript/TypeScript client.
  output   = "./dist/prismaClient" // Put the generated client in your dist folder so it'll be available at runtime.
}

// Table definition
model TaskRecord {
  id    Int    @id @default(autoincrement())
  text  String
}

datasource db {
  provider = "sqlite"
  url = env("DATABASE_URL") // You'll set this environment variable to the Root database filename at runtime.
}
```

## Update `server/package.json`

There are two changes needed to `package.json`: update the build script and add dependencies.

1. Open `server/package.json`.

1. Update the build script to generate the Prisma client. The `prisma generate` command reads your `schema.prisma` file and generates a client based on the models you've defined. This Prisma Client is placed the `output` folder you specified in your schema (`./dist/prismaClient`). It provides an API you use in your TypeScript code to query and manipulate your database. Every time you modify your `schema.prisma` file you need to run `prisma generate` to keep the client up-to-date. Replace the existing `build` script with the following line that runs both `generate` and `tsc`:

	```json
	"build": "prisma generate && tsc",
	```

1. Update your dependencies so they include the Prisma packages:

	```json
	"dependencies": {
	  "sqlite3": "^5.1.7",
	  "knex": "^3.1.0",
	  "@prisma/client": "^6.6.0"
	},
	"devDependencies": {
	  "prisma": "^6.6.0",
	  "@types/node": "^22.10.2"
	},
	```

## Code `server/src/prismaTaskRepository.ts`

Here, you'll use the generated Prisma client to access SQLite. There are two parts of the code that are Root-specific; they're both due to the fact that the Root database filename isn't available until runtime:
- **DATABASE_URL**: You set the URL environment variable at runtime.
- **CREATE TABLE**: You create the table at runtime.
Both operations are normally done at build time when using Prisma.

1. Create a new file named `prismaTaskRepository.ts` in the `server/src` folder.

1. Add the following code to the file. Note the two highlighted sections that are the Root-specific parts:

```ts
import { PrismaClient, TaskRecord } from '../dist/prismaClient'; // import the generated Prisma client
import { rootServer } from '@rootsdk/server-app';

const dbPath = rootServer.dataStore.config.sqlite3!.filename;
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma: PrismaClient = new PrismaClient();

export interface TaskModel {
  id: number;
  text: string;
}

export class PrismaTaskRepository {
  async create(text: string): Promise<TaskModel> {
    const result: TaskRecord = await prisma.taskRecord.create({
      data: { text },
    });
    return { id: result.id, text: result.text };
  }

  async list(): Promise<TaskModel[]> {
    const results: TaskRecord[] = await prisma.taskRecord.findMany();
    return results.map((task: TaskRecord) => ({ id: task.id, text: task.text }));
  }

  async delete(id: number): Promise<number> {
    const deleted: TaskRecord = await prisma.taskRecord.delete({ where: { id } });
    return deleted.id;
  }
}

export const taskRepository: PrismaTaskRepository = new PrismaTaskRepository();

export async function initializePrisma(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TaskRecord (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL
    );
  `);
}
```

## Update `server/src/taskService.ts`

Next, update your existing task service to use the Prisma repository. This is trivial because the code was careful to name the types and methods the same.

1. Open the file `server/src/taskService.ts`.

1. Comment out the following import statement (the one for the in-memory repository):
	```ts
	import { taskRepository, TaskModel } from "./knexTaskRepository";
	```

1. Add the following import statement (for the Knex repository):
	```ts
	import { taskRepository, TaskModel } from "./prismaTaskRepository";
	```

## Update `server/src/main.ts`

1. Call the `initializePrisma` function from `main.ts`.
	
	**Show code**

	```ts
	import { rootServer, RootAppStartState } from "@rootsdk/server-app";
	import { taskService } from "./taskService";

	//import { initializeKnex } from "./knexTaskRepository";
	import { initializePrisma } from "./prismaTaskRepository";

	async function onStarting(state: RootAppStartState) {
	  //await initializeKnex();
	  await initializePrisma();

	  rootServer.lifecycle.addService(taskService);
	}

	(async () => {
	  await rootServer.lifecycle.start(onStarting);
	})();
	```
	

## Test

1. Delete the existing database file `server/rootsdk.sqlite3`.

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