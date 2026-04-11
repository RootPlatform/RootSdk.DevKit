---
path: app-docs/tutorials/showdown-app/initial-state.md
audience: app
category: tutorial
summary: You'll store the number of votes for each option on your server. The number of votes for each will start at zero and go up as clients vote.
---

# Initial state

You'll store the number of votes for each option on your server. The number of votes for each will start at zero and go up as clients vote. Each time a new client starts up, that client will call over to the server to get the current vote counts. There won't be any persistence here; the counts will be held in memory on the server and will reset to zero every time you restart your server.

The goal in this section is to implement the startup state:
- Client-side UI.
- Server-side in-memory storage.
- Remote procedure call (RPC) method the client calls to get the current vote counts.

Here's a table summarizing the new (✨) and updated (⬆️) files you'll be working on:

| Server                     | Networking     | Client     |
|----------------------------|----------------|------------|
| `voteService.ts` (new ✨) | `vote.proto` (new ✨) | `App.tsx` (update ⬆️) |
| `main.ts` (update ⬆️) |  |  |

## Set your scope

Root Apps use protobuf to define the message types that contain the data and the client-server RPC methods. The Root SDK tooling generates TypeScript from your protobuf.

You can choose the scope for the generated TypeScript. The `create-root` tool sets it to your project name by default; however, the sample code in this tutorial uses `showdown` as the scope.

1. Open the file `networking/root-protoc.json`.

1. Set the value for the `scope` option to `@showdown`.

1. Open the file `package.json` in your project folder.

1. Update the scope in the dependencies so it looks like this:

	```json
	"dependencies": {
	  "@rootsdk/client-app": "*",
	  "@rootsdk/server-app": "*",
	  "@showdown/gen-client": "file:./networking/gen/client",
	  "@showdown/gen-server": "file:./networking/gen/server",
	  "@showdown/gen-shared": "file:./networking/gen/shared"
	},
	```

## Delete the example service

1. Delete the file `client/src/Example.tsx`.
1. Delete the file `networking/src/example.proto`.
1. Delete the file `server/src/exampleService.ts`.

## Define the data-transfer objects

When the client starts, it needs to get the vote counts from the server. By convention, types that go from the server to the client have names ending in `Request`. Similarly, types flowing from the server back to the client have names ending in `Response`.

1. Create a new file named `vote.proto` in the `networking/src` folder.

1. Add the following protobuf code to the `vote.proto` file:

	```protobuf
	// Root uses protobuf version 3
	syntax = "proto3";

	// A 'message' bundles data so you can send it across the network - this one holds two numbers.
	// Note: the "=1" and "=2" in the declaration are used internally by protobuf, your code will never use them.
	// They're not initial values. They can be almost anything, as long as they are unique within the message type.
	message Tally {
	  int32 a = 1;
	  int32 b = 2;
	}

	// Message passed from the client to server to request the current tally.
	// No data is needed; however, best practice says to pass this object anyway.
	// If you need to pass data later, you can add fields without changing your API.
	message VoteGetRequest {
	  // Intentionally empty, ready to add fields as needed in the future
	}

	// Message passed from the server to client containing the current tally
	message VoteGetResponse {
	  Tally tally = 1;
	}
	```

1. Open a terminal in your App's project folder. Build the App by running the following command:
	```bash
	npm run build
	```
	The `build` command uses the protobuf compiler and Root SDK tooling to translate your protobuf into TypeScript networking code. 

1. Open the file `networking/gen/shared/src/vote.ts`. Notice how the protobuf message types are now TypeScript interfaces. The `int32` type in `Tally` was changed to the TypeScript type `number`; that's part of the translation from protobuf to TypeScript.

## Define the service

When the client starts, it needs to make a call to the server to get the current vote values. Root Apps use protobuf to define the RPC method. Service methods in protobuf must take exactly one parameter and have exactly one return value.

1. Add the following protobuf code to the `vote.proto` file:

	```protobuf
	// A 'service' defines RPC methods
	service VoteService {
	  rpc Get(VoteGetRequest) returns (VoteGetResponse);
	}
	```

1. Build the App.

1. Open the file `networking/gen/server/src/vote.server.ts` and locate the `VoteServiceBase` class.

1. Notice how it has an `abstract` method named `get` that has a few changes from the `Get` method you defined in protobuf:
	- The name is now lowercase to match TypeScript naming conventions.
	- There's an added `Client` parameter. This code is on the server side, and that `Client` object tells you the identity of the client that made the call.
	- The method is `async` and the return type is now `Promise<VoteGetResponse>` to match TypeScript's asynchronous coding style.

## Implement the service

On the server, your job is to code a class that inherits from `VoteServiceBase` and implements the `get` method.

1. Create a new file named `voteService.ts` in the `server/src` folder.

1. Import the `Tally`, `VoteGetRequest`, `VoteGetResponse`, and `VoteServiceBase` types. There's a pattern to the imports:
	- Types for use on the server are imported from `@showdown/gen-server`.
	- Types for use on the client are imported from `@showdown/gen-client`.
	- Message types are used on both client and server, import them from `@showdown/gen-shared`.

	
	**Show code**

	```ts
	import { VoteResponse } from "@showdown/gen-shared";
	import { Tally, VoteGetRequest, VoteGetResponse } from "@showdown/gen-shared";
	import { VoteServiceBase } from "@showdown/gen-server";
	```
	

1. Add the following to the `voteService.ts` file and complete the implementation using the comments in the code as a guide.

	```ts
	import { Client } from "@rootsdk/server-app";
	
	export class VoteService extends VoteServiceBase {
	  private static tallyA = 0;
	  private static tallyB = 0;

	  async get(request: VoteGetRequest, client: Client): Promise<VoteGetResponse> {
	    // Create a Tally object
	    // Load the a field with the tallyA value
	    // Load the b field with the tallyB value

	    // Create a VoteGetResponse object and set its tally field to the Tally object

	    // return the VoteGetResponse object
	  }
	```
	
	**Show code**

	```ts
	import { Client } from "@rootsdk/server-app";
	import { Tally, VoteGetRequest, VoteGetResponse } from "@showdown/gen-shared";
	import { VoteServiceBase } from "@showdown/gen-server";

	export class VoteService extends VoteServiceBase {
	  private static tallyA = 0;
	  private static tallyB = 0;

	  async get(request: VoteGetRequest, client: Client): Promise<VoteGetResponse> {
	    const tally: Tally = { a: VoteService.tallyA, b: VoteService.tallyB };

	    const response: VoteGetResponse = { tally: tally };

	    return response;
	  }
	}
	```
	

## Register your service

You need to create an instance of your `VoteService` class and register it with Root. The registration lets the Root infrastructure map incoming calls from your client(s) to corresponding server-side implementation.

1. Add the following line to your `voteService.ts` file.
	```ts
	export const voteService = new VoteService();
	```

1. Open the file `server/src/main.ts`.

1. Replace the existing file contents with this code:
	```ts
	import { rootServer, RootAppStartState } from "@rootsdk/server-app";
	import { voteService } from "./voteService";

	async function onStarting(state: RootAppStartState) {
	  rootServer.lifecycle.addService(voteService);
	}

	(async () => {
	  await rootServer.lifecycle.start(onStarting);
	})();
	```

## Implement the client

Your goal here is to call `voteServiceClient.get` from your client.

You don't need to register the client side of the service, Root automatically generates and registers it for you. If you'd like to see how the automatic registration works, you can look in the file `networking/gen/client/src/vote.client.ts` and examine the `VoteServiceClient` type and the `voteServiceClient` instance (note the lowercase first letter). 

1. Open `client/src/App.tsx` and replace the entire contents of the file with the code below. Then complete the one remaining line by following the instruction in the comment.

	```ts
	import React, { useEffect, useState } from "react";
	import { voteServiceClient } from "@showdown/gen-client";
	import { Tally, VoteGetRequest, VoteGetResponse } from "@showdown/gen-shared";

	const App: React.FC = () => {
	const [tally, setTally] = useState<Tally>({ a: 0, b: 0 });

	useEffect(() => {
	  const initialize = async () => {
	    const request: VoteGetRequest = {};

	    const response: VoteGetResponse = // TODO: call the get method on the voteServiceClient object

	    setTally(response.tally!);
	  };

	  initialize();
	}, []);

	  return (
	    <div>
	      <h1>Showdown: Cats vs Dogs</h1>
	      <h2>Live results</h2>
	      <div>
	        <p>Cats: {tally.a}</p>
	        <p>Dogs: {tally.b}</p>
	      </div>
	    </div>
	  );
	};

	export default App;
	```

	
	**Show code**

	```ts
	const response: VoteGetResponse = await voteServiceClient.get(request);
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
	You should see the initial vote counts set to zero.