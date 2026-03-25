// TODO: delete this example code if not needed

// Use "@rootsdk/server-bot" to import the Root API types
import {
  rootServer,
  MessageType,
  ChannelMessage,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageCreateRequest,
  RootApiException,
} from "@rootsdk/server-bot";

// Initialize your Bot (set up your database, subscribe to community events, etc.)
export function initializeExample(): void {
  // Example: subscribe to be notified when members post new messages to any channel your Bot can see
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onMessage,
  );
}

// Example: process channel messages that start with "/echo ", send back the incoming text
async function onMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  // Ignore Root System messages - they aren't of interest to the Bot, nor will they have any 'messageContent'
  if (evt.messageType === MessageType.System) return;

  const prefix: string = "/echo ";

  // You receive all messages, only respond to ones that start with "/echo "
  if (!evt.messageContent?.startsWith(prefix)) return;

  // Retrieve the incoming message text without the "/echo " prefix
  const incomingText: string = evt.messageContent
    ?.substring(prefix.length)
    .trim();

  // Prepare the response - echo the incoming text to the same channel as the incoming message
  const createMessageRequest: ChannelMessageCreateRequest = {
    channelId: evt.channelId,
    content: incomingText,
  };

  try {
    // Send the response to the community
    const cm: ChannelMessage =
      await rootServer.community.channelMessages.create(createMessageRequest);
  } catch (xcpt: unknown) {
    // Handle Root-generated exceptions
    if (xcpt instanceof RootApiException) {
      // 'errorCode' tells you what went wrong.
      // E.g., perhaps your Bot doesn't have permission to create messages.
      console.error("RootApiException:", xcpt.errorCode);
    } else if (xcpt instanceof Error) {
      console.error("Unexpected error:", xcpt.message);
    } else {
      console.error("Unknown error:", xcpt);
    }
  }
}
