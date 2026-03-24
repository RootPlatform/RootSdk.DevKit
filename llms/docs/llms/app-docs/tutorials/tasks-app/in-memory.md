---
path: app-docs/tutorials/tasks-app/in-memory.md
audience: app
category: tutorial
summary: In this section, you'll build the _Tasks_ App with in-memory storage in your server.
---

# In-memory storage

In this section, you'll build the _Tasks_ App with in-memory storage in your server. There won't be any persistence yet; all data will be lost every time you restart your server. The goal is to make sure the core of the App is working before adding the complexity of a database.

There are several files to write, and the code will be supplied; you'll be putting the pieces together. Here's a table summarizing the new (✨) and updated (⬆️) files you'll be working on:

| Server                     | Networking     | Client     |
|----------------------------|----------------|------------|
| `memoryTaskRepository.ts` (new ✨) | `task.proto` (new ✨) | `App.tsx` (update ⬆️) |
| `taskService.ts` (new ✨) |  |  |
| `main.ts` (update ⬆️) |  |  |

## Set your scope

Root Apps use protobuf to define the message types that contain the data and the client-server RPC methods. The Root SDK tooling generates TypeScript from your protobuf.

You can choose the scope for the generated TypeScript. The `create-root` tool sets it to your project name by default; however, the sample code in this tutorial uses `tasks` as the scope.

1. Open the file `networking/root-protoc.json`.

1. Set the value for the `scope` option to `@tasks`.

1. Open the file `package.json` in your project folder.

1. Update the scope in the dependencies so it looks like this:

	```json
	"dependencies": {
	  "@rootsdk/client-app": "*",
	  "@rootsdk/server-app": "*",
	  "@tasks/gen-client": "file:./networking/gen/client",
	  "@tasks/gen-server": "file:./networking/gen/server",
	  "@tasks/gen-shared": "file:./networking/gen/shared"
	},
	```

## Delete the example service

1. Delete the file `client/src/Example.tsx`.
1. Delete the file `networking/src/example.proto`.
1. Delete the file `server/src/exampleService.ts`.

## Code `networking/src/task.proto`

You'll first define your Protobuf service. It will have three methods for the client to call when users manipulate the task list: create new task, list all tasks, and delete an existing task. From the server side, it needs two broadcast methods so it can notify the clients when tasks are created or deleted.

1. Create a new file named `task.proto` in the `networking/src` folder.

1. Add the following code to the file:

```protobuf
syntax = "proto3";

import "rootsdk/types.proto";

package tasks;

message Task {
  uint32 id   = 1;
  string text = 2;
}

// Create

message TaskCreateRequest {
  string text = 1;
}

message TaskCreateResponse {
  Task task = 1;
}

message TaskCreatedEvent {
  Task task = 1;
}

// List

message TaskListRequest {
  // Intentionally empty, ready to add fields as needed in the future
}

message TaskListResponse {
  repeated Task tasks = 1;
}

// Delete

message TaskDeleteRequest {
  uint32 id = 1;
}

message TaskDeleteResponse {
  // Intentionally empty, ready to add fields as needed in the future
}

message TaskDeletedEvent {
  uint32 id = 1;
}

// Service

service TaskService {
  rpc Create(TaskCreateRequest) returns (TaskCreateResponse);
  rpc List  (TaskListRequest)   returns (TaskListResponse);
  rpc Delete(TaskDeleteRequest) returns (TaskDeleteResponse);

  rpc BroadcastCreated(TaskCreatedEvent) returns (rootsdk.Void);
  rpc BroadcastDeleted(TaskDeletedEvent) returns (rootsdk.Void);
}
```

## Code `server/src/memoryTaskRepository.ts`

On the server, you need to implement the in-memory data repository and the service class.

1. Create a new file named `memoryTaskRepository.ts` in the `server/src` folder.

1. Add the following code to the file:

	```ts
	export interface TaskModel {
	  id: number;
	  text: string;
	}

	export class MemoryTaskRepository {
	  private tasks: Map<number, TaskModel> = new Map();
	  private nextId: number = 1;

	  public async create(text: string): Promise<TaskModel> {
	    const newTask: TaskModel = { id: this.nextId++, text };

	    this.tasks.set(newTask.id, newTask);

	    return newTask;
	  }

	  public async list(): Promise<TaskModel[]> {
	    return Array.from(this.tasks.values());
	  }

	  public async delete(id: number): Promise<number> {
	    const existed = this.tasks.delete(id);
	    return existed ? id : -1;
	  }
	}

	export const taskRepository = new MemoryTaskRepository();
	```

1. Notice how this version of the repository stores tasks in a `Map`. In later steps, you'll replace this entire class with versions that use a database.

## Code `server/src/taskService.ts`

1. Create a new file named `taskService.ts` in the `server/src` folder.

1. Add the following code to the file:

```ts
import { Client } from "@rootsdk/server-app";
import {
  TaskCreateRequest,
  TaskCreateResponse,
  TaskCreatedEvent,
  TaskListRequest,
  TaskListResponse,
  TaskDeleteRequest,
  TaskDeleteResponse,
  TaskDeletedEvent,
} from "@tasks/gen-shared";
import { TaskServiceBase } from "@tasks/gen-server";

import { taskRepository, TaskModel } from "./memoryTaskRepository";

export class TaskService extends TaskServiceBase {
  async create(request: TaskCreateRequest, client: Client): Promise<TaskCreateResponse> {
    const task: TaskModel = await taskRepository.create(request.text);

    const event: TaskCreatedEvent = { task: { id: task.id, text: task.text } };
    this.broadcastCreated(event, "all", client);

    const response: TaskCreateResponse = { task: { id: task.id, text: task.text } };
    return response;
  }

  async list(request: TaskListRequest, client: Client): Promise<TaskListResponse> {
    const tasks: TaskModel[] = await taskRepository.list();

    const response: TaskListResponse = { tasks: tasks.map((t) => ({ id: t.id, text: t.text, })), };

    return response;
  }

  async delete(request: TaskDeleteRequest, client: Client): Promise<TaskDeleteResponse> {
    await taskRepository.delete(request.id);

    const event: TaskDeletedEvent = { id: request.id };
    this.broadcastDeleted(event, "all", client);

    const response: TaskDeleteResponse = { id: request };
    return response;
  }
}

export const taskService = new TaskService();
```

## Update `server/src/main.ts`

1. Notice the `export` statement for `taskService` at the end of the previous code block. You need to import that `taskService` object into `server/src/main.ts` and register it with Root. Replace the entire contents of `main.ts` with the following code:

	```ts
	import { rootServer, RootAppStartState } from "@rootsdk/server-app";
	import { taskService } from "./taskService";

	async function onStarting(state: RootAppStartState) {
	  rootServer.lifecycle.addService(taskService);
	}

	(async () => {
	  await rootServer.lifecycle.start(onStarting);
	})();
	```

## Update `client/src/App.tsx`

In this last step, you'll set up the client-side UI. It's intentionally minimal since the point of this tutorial is server-side data storage.

1. Open the `App.tsx` in the `client/src` folder.

1. Replace the entire file contents with the following code:

```ts
import React, { useEffect, useState } from 'react';
import { taskServiceClient, TaskServiceClientEvent } from '@tasks/gen-client';
import {
  Task,
  TaskCreateRequest,
  TaskCreateResponse,
  TaskCreatedEvent,
  TaskListRequest,
  TaskListResponse,
  TaskDeleteRequest,
  TaskDeletedEvent,
} from "@tasks/gen-shared";
const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  //
  // Load current data from server when this client starts
  //

  useEffect(() => {
    const initialize = async () => {
      const request: TaskListRequest = {};
      const response: TaskListResponse = await taskServiceClient.list(request);
      setTasks(response.tasks);
    };

    initialize();
  }, []);

  //
  // Handle when this client creates or deletes tasks
  //

  const createClick = async () => {
    const request: TaskCreateRequest = { text: newTaskText };
    const response: TaskCreateResponse = await taskServiceClient.create(request);

    setTasks(prev => [...prev, response.task!]);
    setNewTaskText('');
  };

  const deleteClick = async (id: number) => {
    const request: TaskDeleteRequest = { id };
    await taskServiceClient.delete(request);

    setTasks(prev => prev.filter(task => task.id !== id));
  };

  //
  // Handle when other clients create or delete tasks
  //
  const handleCreated = (event: TaskCreatedEvent) => { setTasks(prev => [...prev, event.task!]); };
  const handleDeleted = (event: TaskDeletedEvent) => { setTasks(prev => prev.filter(task => task.id !== event.id)); };

  useEffect(() => {
    taskServiceClient.on(TaskServiceClientEvent.Created, handleCreated);
    taskServiceClient.on(TaskServiceClientEvent.Deleted, handleDeleted);

    return () => {
      taskServiceClient.off(TaskServiceClientEvent.Created, handleCreated);
      taskServiceClient.off(TaskServiceClientEvent.Deleted, handleDeleted);
    };
  }, []);

  //
  // UI
  //

  return (
    <div>
      <h1 className="text-xl">Tasks</h1>

      <div>
        <input placeholder="New task" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
        <button onClick={createClick}>Create</button>
      </div>

      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <span>{task.text}</span>
            <button onClick={() => deleteClick(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
```

## Test

1. Open a terminal in your App's project folder.

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

1. Shut down the server and client and then run both again. Notice that the list of tasks is empty. The task you added was lost when you shut down your server.