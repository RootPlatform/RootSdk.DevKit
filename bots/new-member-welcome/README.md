---
kind: sample-bot
description: Welcome new members
complexity: minimal
key_patterns:
  - member join event subscription
permissions:
  - channel.createMessage
---

# new-member-welcome

A greeter bot. When a new member joins the community, it posts a one-line welcome that mentions them in the community's default channel. Reach for this sample as the smallest example of reacting to a community-level lifecycle event.

## What it demonstrates

- Subscribing to `CommunityEvent.CommunityJoined` on `rootServer.community.communities` to react to member joins.
- Filtering joins to humans only via `RootGuidUtils.toRootGuidType` so bot/app installs don't trigger a welcome.
- Reading `community.defaultChannelId` from `rootServer.community.communities.get` and gracefully no-op-ing when the community admin hasn't configured one.
- Composing a `[@nickname](root://user/<id>)` mention and posting it with `rootServer.community.channelMessages.create`.

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
