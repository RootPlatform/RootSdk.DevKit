---
path: bot-docs/tutorials/announce-bot/overview.md
audience: bot
category: tutorial
summary: In this tutorial, you'll build a Bot that listens for a specific command in a Root community and responds by broadcasting the message to all text...
---

# Tutorial: Announce Bot

In this tutorial, you'll build a Bot that listens for a specific command in a Root community and responds by broadcasting the message to all text channels.

## Root concepts covered

- **Listening for events**: Hook into `ChannelMessageCreatedEvent` to react when users send messages.
- **Command parsing**: Check message content to identify `/announce` commands.
- **User mentions**: Retrieve the sender's nickname and format a Root-style user mention.
- **Channel discovery**: Enumerate all community channel groups and text channels.
- **Message sending**: Send a custom message to every text channel in the community.
- **Error handling**: Gracefully handle and log both expected and unexpected exceptions using `RootApiException`.

## Prerequisites

- High-beginner to low-intermediate level TypeScript knowledge including asynchronous coding.

## Solution code

A fully implemented version of this project is available in the Root [samples repository](https://github.com/RootPlatform/RootSdk.Samples/tree/main/Bots/AllChannelBroadcast).