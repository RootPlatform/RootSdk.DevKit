---
path: bot-docs/tutorials/announce-bot/add-member-nickname.md
audience: bot
category: tutorial
summary: In this section, the main goal is to include the member's nickname in your Bot's response. But first, you'll change the command your Bot looks for.
---

# Add member nickname

In this section, the main goal is to include the member's nickname in your Bot's response. But first, you'll change the command your Bot looks for.

## 1. Update the command

1. Open the `src/example.ts` file.

1. Locate the line that defines the prefix.

1. Change it from `/echo ` to `/announce `
	
	**Show code**

	```ts
	const prefix: string = "/announce ";
	```
	

1. Build and run your Bot to verify that it now responds to `/announce`.

## 2. Add nickname

1. Import `UserGuid` from `"@rootsdk/server-bot"`.

1. In the `onMessage` function, add a line of code that retrieves the `userId` property of the `evt` object. The `userId` is of type `UserGuid` so you'll need to add it to your imports.
	
	**Show code**

	```ts
	const userId: UserGuid = evt.userId;
	```
	

1. Modify the code to include the `userId` in the response message. You can use string concatenation on the `UserGuid` object.
	
	**Show code**

	```ts
	const response: string = userId + " said " + incomingText;
	const createMessageRequest: ChannelMessageCreateRequest = { channelId: evt.channelId, content: response };
	```
	

1. Run the Bot to test your work.

1. Notice that the `userId` isn't useful to community members. The Root API lets you exchange the `userId` for a `CommunityMember` object that contains the member's `nickname`. This will be much more useful for members to see than the `userId`. Complete the implementation of the following function to get the `nickname`.
	```ts
	// add CommunityMember and CommunityMemberGetRequest to your imports

	async function getMemberNickname(userId: UserGuid): Promise<string> {
	  // TODO: Create a CommunityMemberGetRequest object containing the userId

	  // TODO: Call the async method rootServer.community.communityMember.get() to retrieve a CommunityMember object

	  // TODO: Extract and return the nickname property.
	}
	```

	
	**Show code**

	```ts
	async function getMemberNickname(userId: UserGuid): Promise<string> {
	  const request: CommunityMemberGetRequest = { userId: userId };

	  const member: CommunityMember = await rootServer.community.communityMembers.get(request);

	  return member.nickname;
	}
	```
	

1. Modify your response to include the `nickname` instead of the `userId`.
	
	**Show code**

	```ts
	const userId: UserGuid = evt.userId;
	const nickname: string = await getMemberNickname(userId);
	const response: string = nickname + " said " + incomingText;
	const createMessageRequest: ChannelMessageCreateRequest = { channelId: evt.channelId, content: response };
	```
	

1. Run the Bot to test your work. You should see a human-readable name for the member.

## 3. Format the nickname as a mention

A _mention_ is a Root-specific link that lets other members easily interact with that member. The format is `root://user/userId`.

1. Use the following code to format the member's nickname as a mention:
	```ts
	const mention = "[@" + nickname + "](root://user/" + evt.userId + ")";
	```

1. Replace the `nickname` with the `mention` in your response.

1. Run the Bot to test your work. Select the mention in the Root native client to see the functionality it enables.