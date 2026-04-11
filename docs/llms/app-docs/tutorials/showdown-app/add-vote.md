---
path: app-docs/tutorials/showdown-app/add-vote.md
audience: app
category: tutorial
summary: In this section, you'll add voting support. The UI will have two buttons.
---

# Add voting support

In this section, you'll add voting support. The UI will have two buttons. When a member clicks one of the buttons, you'll send a message to your server to record the vote. The server will return the new vote counts which you'll use to update your UI. There are three components to code: networking, server, and client.

Here's a table summarizing the files you'll be updating (⬆️):

| Server                     | Networking     | Client     |
|----------------------------|----------------|------------|
| `voteService.ts` (update ⬆️) | `vote.proto` (update ⬆️) | `App.tsx` (update ⬆️) |

## Networking

When a member clicks one of the buttons in the UI, your client code will need to send a message to your server. The message will need to indicate which of the two options the member selected. To make this a bit more generic, you'll use a `string` as the message data with `A` and `B` representing the two options.

1. Open `vote.proto` in the `networking/src` folder.

1. Add the following protobuf code to the `vote.proto` file:

	```protobuf
	message VoteAddRequest {
	  string choice = 1;
	}

	message VoteAddResponse {
	  Tally tally = 1;
	}
	```

1. Add the following method to the `VoteService` service:

	```protobuf
	rpc Add(VoteAddRequest) returns (VoteAddResponse);
	```

	When you build, the tooling will generate a method in the `VoteServiceBase` type that looks like this:
	```ts
	abstract add(request: VoteAddRequest, client: Client): Promise<VoteAddResponse>;
	```

## Server

Here, you'll implement the `add` method in your existing service class.

1. Open the `voteService.ts` file in the `server/src` folder.

1. Import the `VoteAddRequest` and `VoteAddResponse` types from `@showdown/gen-shared`.

1. Add the following `add` method to your `VoteService` class and complete the implementation using the comments in the code as a guide.

	```ts
	async add(request: VoteAddRequest, client: Client): Promise<VoteAddResponse> {

	  // Look at request.choice (it'll be either "A" or "B") and increment tallyA or tallyB as appropriate.

	  // Create a Tally object containing the tallyA and tallyB values.
	  // Create a VoteAddResponse object containing Tally object.

	  // Return the response.
	}
	```

	
	**Show code**

	```ts
	async add(request: VoteAddRequest, client: Client): Promise<VoteAddResponse> {
	  if (request.choice === "A")
	    VoteService.tallyA++;
	  else if (request.choice === "B")
	    VoteService.tallyB++;

	  const tally: Tally = { a: VoteService.tallyA, b: VoteService.tallyB };

	  const response: VoteAddResponse = { tally: tally };
	  return response;
	}
	```
	

## Client

On the client, you'll need to add two buttons with click event handlers. When a member clicks either button, you'll send that vote to the server and use the returned `VoteResponse` object to update both vote counts in your UI.

1. Open `client/src/App.tsx`.

1. Import the `VoteAddRequest` and `VoteAddResponse` types from `@showdown/gen-shared`.

1. Add two buttons with `onClick` subscriptions as shown below:

	```ts
	return (
	  <div>
	    <h1>Showdown: Cats vs Dogs</h1>
	    <div>
	      <button onClick={() => sendVote("A")}>Cats</button>
	      <button onClick={() => sendVote("B")}>Dogs</button>
	    </div>
	    <h2>Live results</h2>
	    <div>
	      <p>Cats: {tally.a}</p>
	      <p>Dogs: {tally.b}</p>
	    </div>
	  </div>
	);
	```

1. Add the following `sendVote` method to your `App` type; then complete the one remaining line using the comment in the code as a guide.

	```ts
	const sendVote = async (choice: "A" | "B"): Promise<void> => {
	  const request: VoteAddRequest = { choice };
	  const response: VoteAddResponse = // call the add method on the voteServiceClient object

	  setTally(response.tally!);
	};
	```
	
	**Show code**

	```ts
	const sendVote = async (choice: "A" | "B"): Promise<void> => {
	  const request: VoteAddRequest = { choice };
	  const response: VoteAddResponse = await voteServiceClient.add(request);

	  setTally(response.tally!);
	};
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
	You should see the initial vote counts set to zero. If your browser doesn't launch automatically, you can open your browser manually and navigate to `http://localhost:5173/`.

1. Click on one of the voting buttons. You should see the vote count for that option update. Notice that it's possible to vote multiple times; this is a simplification in the tutorial to keep things manageable.

1. Open a second browser window and navigate to `http://localhost:5173/`. You should see the correct vote counts where the option you voted for in the previous step set to one.

1. In the new browser window, click one of the voting buttons. The vote totals in your current window will update. Examine the first browser window and notice that the vote counts there are incorrect. The vote counts on your server did get updated; however, the server didn't notify the clients of the change so the first browser window had no idea that it needed to update.