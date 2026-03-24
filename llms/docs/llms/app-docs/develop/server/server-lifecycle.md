---
path: app-docs/develop/server/server-lifecycle.md
audience: app
category: guide
summary: Your server runs in the Root cloud, and Root manages when it starts, stops, and restarts.
---

# Server lifecycle

Your server runs in the Root cloud, and Root manages when it starts, stops, and restarts. This article explains how the server lifecycle works, how to define your entry point, run initialization code, and handle orderly shutdowns.

## When does your server run?

Root controls when your server runs. The two normal cases are:
- When your app is installed into a community, Root creates and starts an instance for that community.
- Root might restart your server during maintenance.

There are three situations where Root will automatically restart your server after a problem:
- If your server crashes.
- If you intentionally stop your server.
- If there's an unhandled exception during startup, shutdown, a scheduled job, or inside your Community API event handler.

When your server restarts, all attached clients in that community automatically get restarted.

## When will Root take your server offline?

Root may take your server offline if Root determines it's delivering a poor customer experience. Generally, this occurs when your server crashes repeatedly. 

Servers are taken offline on a community-by-community basis. That is, if your server crashes repeatedly in one community, it's only taken offline in that individual community.

You'll need to release an updated version of your code to re-enable your server.

## What is the server lifecycle?

The *lifecycle* is the set of states your server moves through: *NotRunning*, *Starting*, *Started*, *Stopping*, and *Stopped*.

[Diagram: Diagram of the lifecycle states of your server-side code. The server transitions between the not running, starting, running, and stopping states.]
```
stateDiagram-v2
    direction LR
    [*] --> NotRunning
    NotRunning --> Starting
    Starting --> Started
    Started --> Stopping
    Stopping --> Stopped
    Stopped --> NotRunning
```

## What do you control?

You control two things as your server moves through its lifecycle:
1. Required: call `rootServer.lifecycle.start` to move from **NotRunning** to **Starting**.
1. Optional: call `rootServer.lifecycle.stop` to move from **Started** to **Stopping** if your code can’t continue.

## Lifecycle callbacks

The Root API lets you register three lifecycle callbacks that Root invokes when your server enters the corresponding state. They're all optional.

1. A **starting callback** to handle initialization during the **Starting** state.
1. A **stopping callback** to begin your cleanup during the **Stopping** state.
1. A **stopped callback** to do any final cleanup during the **Stopped** state.

[Diagram: Diagram of the lifecycle states of your server-side code. You call start and stop to cause state transitions.]
```
stateDiagram-v2
    direction LR
    [*] --> NotRunning
    NotRunning --> Starting: You call start()
    note right of Starting
  Root invokes your<br/>starting callback.</br>Do your initialization here.
end note
    Starting --> Started: The call to<br/>your starting<br/>callback returns.
    Started --> Stopping: You or Root calls stop()
    note right of Stopping
  Root invokes your<br/>stopping callback.<br/>Stop workers and begin your cleanup here.
end note
    Stopping --> Stopped
    note right of Stopped
  Root invokes your<br/>stopped callback.<br/>Final chance to clean up.
end note
    Stopped --> NotRunning
```

### Starting

Root invokes your **starting callback** when your server moves into the **Starting** state. Do all your initialization and setup here; Root can’t guarantee the Root APIs are ready before this point.

Typical things you might do here:
- Register services.
- Initialize database.
- Apply global settings.
- Subscribe to API events.

### Stopping

Root invokes your **stopping callback** when your server moves into the **Stopping** state. This state means Root is giving you early notice that it has begun the process of shutting down your server.

You should stop any long-running process and persist any unsaved state. If you need to store anything external to Root, you should do it here so you have the most time to get it done. You might also consider logging a message either to yourself by printing to the console or to the community using the logging API.

If your code saves state aggressively as it runs, you might not need to register this callback.

Your stopping callback will run only in cases of orderly shutdown like when Root maintenance causes a restart of your server or you call `rootServer.lifecycle.stop`. It isn't guaranteed to run during abnormal termination; for example, if your server crashes.

### Stopped

Root invokes your **stopped callback** when your server moves into the **Stopped** state. This state means Root has begun the process of shutting down the cloud container that's running your server. This is your final opportunity to do any cleanup or save state.

As with the **stopping callback**, if your code saves state aggressively as it runs, you might not need this callback.

Your stopped callback will run only in cases of orderly shutdown like when Root maintenance causes a restart of your server or you call `rootServer.lifecycle.stop`. It isn't guaranteed to run during abnormal termination; for example, if your server crashes.

## How to register your callbacks and launch your server

Use the following pattern to handle server launch, initialization, and cleanup.

### 1. Declare your entry point

Set the `launch` element of your manifest to your server's entry-point file. Notice that the file you're pointing at is in the `dist` folder; it's the compiled version of your `main.ts`.

```json
{
  "name": "MyName",
  "description": "My description",
  "version": "1.0.0",
  "launch":
  {
    "server": "server/dist/main.js"
  }
}
```

### 2. Implement your start callback

The **starting callback** takes a `RootAppStartState` that gives you information about the community this instance is serving (ID, members, roles). In addition, it has the global setting values that the community member with the `Manage Apps` permission selected during installation.

```ts
import { RootAppStartState } from "@rootsdk/server-app";

async function onStarting(state: RootAppStartState) {
  // Do all your initialization here
}
```

### 3. Implement your stopping callback

```ts
async function onStopping() {
  // Do your main cleanup here
}
```

### 4. Implement your stopped callback

```ts
async function onStopped() {
  // Do any last-second cleanup here
}
```

### 5. Call start and register your callbacks

Call `rootServer.lifecycle.start` and pass in your callbacks.

```ts
import { rootServer, RootAppStartState } from "@rootsdk/server-app";

async function onStarting(state: RootAppStartState) {
  // Do all your initialization here
}

async function onStopping() {
  // Do your main cleanup here
}

async function onStopped() {
  // Do any last-second cleanup here
}

(async () => {
  // Various ways to call start
  await rootServer.lifecycle.start();                                  // No callbacks
  await rootServer.lifecycle.start(onStarting);                        // Starting callback only
  await rootServer.lifecycle.start(onStarting, undefined, onStopped);  // Pass undefined to skip unneeded callbacks
  await rootServer.lifecycle.start(onStarting, onStopping, onStopped); // All
})();
```

### Example

```ts
// Import Root APIs
import { rootServer, RootAppStartState } from "@rootsdk/server-app";

// Import your initialization functions
import { initializeMyService  } from "./myService";
import { initializeMyDatabase } from "./myDatabase";

// Define your start callback
async function onStarting(state: RootAppStartState) {
  await initializeMyDatabase();
  await initializeMyService();
}

// Define your stop callback
async function onStopping() {
  const request: CommunityAppLogCreateRequest = {
    communityAppLogType: CommunityAppLogType.Error,
    message: "your-message-to-the-community-goes-here"
  };

  await rootServer.datastore.logs.community.create(request);
}

(async () => {
  // Register your callbacks, typically only onStarting and onStopping are needed
  await rootServer.lifecycle.start(onStarting, onStopping);
})();
```