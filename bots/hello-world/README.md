---
kind: sample-bot
description: Echo/ping responder
complexity: minimal
key_patterns:
  - message event handling
  - basic reply
permissions:
  - channel.createMessage
---

# hello-world

A minimal "echo bot." It listens for `/echo <text>` in any text channel and replies with `(EchoBot) <nickname> said <text>`. Reach for this sample as the smallest viable shape of a Root bot — one event subscription, one reply.

## What it demonstrates

- Subscribing to `ChannelMessageEvent.ChannelMessageCreated` from `rootServer.community.channelMessages`.
- Filtering out non-human authors with `RootGuidUtils.toRootGuidType` (skip bots/apps) and `MessageType.System` (skip system messages) before responding.
- Looking up the speaker's nickname via `rootServer.community.communityMembers.get` to personalize the reply.
- Sending a reply with `rootServer.community.channelMessages.create`.
- Handling `RootApiException` by branching on `ErrorCodeType` (e.g. `NoPermissionToCreate`, `TooManyRequests`).

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

## Run

```sh
npm install
npm run build
npm run bot
```
