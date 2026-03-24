---
path: bot-docs/tutorials/welcome-bot/store-message-count.md
audience: bot
category: tutorial
summary: You need to store the number of messages each member posts. To make sure your code works even if your Bot restarts, you should use the Root API's...
---

# Store the message count for each member

You need to store the number of messages each member posts. To make sure your code works even if your Bot restarts, you should use the Root API's `KeyValueStore` type. Root automatically backs up and restores the key-value store, so your data is persistent.

## 1. Store the count

1. Open the file `src/example.ts`.

1. Locate the `onMessage` function.

1. Remove the `echo` functionality (listening for `/echo` and responding).

1. Add the following lines of code to `onMessage` after the check for system messages. The `appData` property is the `KeyValueStore` object. The `update` method is perfect for this use case, here's how it works:
	- Updates a value associated with a key.
	- You must include a transformation function to perform the update: the old value is retrieved, the function is called with the old value, the function's return value is used as the new value in the key-value store.
	- If the key does not exist, this conceptually becomes a set operation. The transformation function is applied to the default and the result becomes the value in the set operation.

	```ts
	const count: number = await rootServer.dataStore.appData.update(evt.userId, (val:number) => val + 1, 0);
	console.log(evt.userId + " " + count);
	```

## 2. Test and clean up

1. Build and run your Bot.

1. Use the Root native client to post messages to community channels. Verify that the `console.log` message shows 1 on your first message, 2 on your second, etc. This indicates the storage and `update` method are working correctly.

1. Stop your Bot.

1. Delete the `rootsdk.sqlite3` file from your Bot's project folder. The file contains the key-value store data, so deleting the file will reset the counts.