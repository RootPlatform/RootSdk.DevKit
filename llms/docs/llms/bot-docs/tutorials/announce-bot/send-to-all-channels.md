---
path: bot-docs/tutorials/announce-bot/send-to-all-channels.md
audience: bot
category: tutorial
summary: Currently, your Bot sends its response only to the same channel as the incoming message.
---

# Send to all text channels

Currently, your Bot sends its response only to the same channel as the incoming message. The goal here is to extend this so it sends to all text channels in the community to which your Bot has access.

Note that when you get channel groups and channels, the Root API will only return the things your Bot has permission to see. The community is in charge of this; they can add or remove permissions at their discretion.

## 1. Get all channels

1. Open the `src/example.ts` file.

1. Add the following types to your imports.
	```ts
	Channel,
	ChannelGuid,
	ChannelType,
	ChannelGroup,
	ChannelListRequest,
	```

1. In this step, you'll retrieve the IDs of all text channels in your community that you have access to. There are two key facts you'll need to know here:
	- Every channel in Root is always nested inside a channel group. In order to get all channels, the Root API requires that you first get all channel groups and then get all channels within each group.
	- Root has different types of channels: text, app, voice, etc. They're all listed in the `ChannelType` enum. You'll need to filter so you only send to `ChannelType.Text` channels.

	Complete the implementation of the following function using the comments as a guide.
	```ts
	async function getChannelGuids(): Promise<ChannelGuid[]> {
	  const channelIds: ChannelGuid[] = [];

	  // TODO: use rootServer.community.channelGroups.list() to get the IDs of all channel groups 
	  const channelGroups: ChannelGroup[] = ...

	  for (const channelGroup of channelGroups) {
	    // TODO: create a ChannelListRequest object with the current channel group ID

	    // TODO: call rootServer.community.channels.list() to get all the IDs for all channels in that channel group
	    const channels: Channel[] = ...

	    for (const channel of channels) {
	      if (channel.channelType === ChannelType.Text) {
	        channelIds.push(channel.id);
	      }
	    }
	  }

	  return channelIds;
	}
	```
	
	**Show code**

	```ts
	async function getChannelGuids(): Promise<ChannelGuid[]> {
	  const channelIds: ChannelGuid[] = [];

	  const channelGroups: ChannelGroup[] = await rootServer.community.channelGroups.list();

	  for (const channelGroup of channelGroups) {
	    const request: ChannelListRequest = { channelGroupId: channelGroup.id };

	    const channels: Channel[] = await rootServer.community.channels.list(request);

	    for (const channel of channels) {
	      if (channel.channelType === ChannelType.Text) {
	        channelIds.push(channel.id);
	      }
	    }
	  }

	  return channelIds;
	}
	```
	

## 2. Send to all channels

1. Complete the implementation of the following function using the comments as a guide.
	```ts
	async function sendMessage(reply: string, channels: ChannelGuid[]): Promise<void> {
	  for (const channelGuid of channels) {
	    // TODO: send the reply to the channel represented by channelGuid
	  }
	}
	```
	
	**Show code**

	```ts
	async function sendMessage(reply: string, channels: ChannelGuid[]): Promise<void> {
	  for (const channelGuid of channels) {
	    const request: ChannelMessageCreateRequest = { channelId: channelGuid, content: reply };
	    await rootServer.community.channelMessages.create(request);
	  }
	}
	```
	

1. Update the `onMessage` function to use `getChannelGuids` and `sendMessage` to send your response to the community.
	
	**Show code**

	```ts
	const channelGuids: ChannelGuid[] = await getChannelGuids();

	await sendMessage(response, channelGuids);
	```
	

1. Run your Bot to test your work. Create multiple text channels in your General channel group if needed. You should see the response message appear in all community text channels that your Bot can see.