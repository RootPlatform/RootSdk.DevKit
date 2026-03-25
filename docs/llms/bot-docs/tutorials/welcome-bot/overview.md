---
path: bot-docs/tutorials/welcome-bot/overview.md
audience: bot
category: tutorial
summary: In this tutorial, you'll build a Bot that counts the number of messages each user posts and assigns a special role after they post their 5th message.
---

# Tutorial: Welcome Bot

In this tutorial, you'll build a Bot that counts the number of messages each user posts and assigns a special role after they post their 5th message. This is a much-simplified version of a common community-management Bot that could welcome new members, monitor their activity, give them more access as they participate, and so on.

## Root concepts covered

- **Persistence using key-value-store**: Use the Root API's `KeyValueStore` to record the number of messages posted by each user.
- **Role assignment**: Assign roles programmatically.

## Prerequisites

- High-beginner to low-intermediate level TypeScript knowledge including asynchronous coding.

## Solution code

A fully implemented version of this project is available in the Root [samples repository](https://github.com/RootPlatform/RootSdk.Samples/tree/main/Bots/RoleAssignment).