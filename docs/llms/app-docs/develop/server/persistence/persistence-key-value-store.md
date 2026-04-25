---
path: app-docs/develop/server/persistence/persistence-key-value-store.md
audience: app
category: guide
summary: The KeyValueStore type stores your data as key-value pairs. Data is stored in a SQLite file so it will persist across restarts of your server.
---

> **Worked sample**: `api-samples/server-key-value-store/` — Key-Value Store

# Key-value store persistence

The [KeyValueStore](../../../../app-api-reference/server/type-aliases/KeyValueStore.md) type stores your data as key-value pairs. Data is stored in a SQLite file so it will persist across restarts of your server. Root automatically backs up and restores the data file so you won't lose data if your server restarts unexpectedly.

## How to use it

Root automatically creates an instance of the [KeyValueStore](../../../../app-api-reference/server/type-aliases/KeyValueStore.md) type for you and makes it available through the `rootServer.dataStore.appData` property.

Here are the key details to keep in mind:

- Keys are always strings  
- Values can be any type (Root saves them as JSON strings internally)
- All method calls are asynchronous.

## Example

Suppose your wanted to implement a simple leveling system for members. You'd award _experience points_ to members based on their actions. For each `userId`, you'd store their number of points. This type of one-to-one mapping is a good fit for key-value storage:

```ts
// The KeyValueStore object is in rootServer.dataStore.appData
import { rootServer } from "@rootsdk/server-app";

const userId: string = "..."; // You'd retrieve the userId from the incoming community message

// Set user XP to 100
await rootServer.dataStore.appData.set<number>({
  key: userId,
  value: 100,
});

// Get user XP
const xp: number = await rootServer.dataStore.appData.get<number>(userId) ?? 0;

// Add 50 XP
const updatedXp: number = await rootServer.dataStore.appData.update<number>(
  userId,
  (currentXp) => currentXp + 50, // Update function
  0 // Default XP to pass to update function if this userId isn't set yet
);
```