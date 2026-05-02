---
kind: sample-bot
description: Broadcast to all channels
complexity: moderate
key_patterns:
  - channel listing
  - multi-channel messaging
  - global settings (member group)
  - per-call error isolation
permissions:
  - channel.createMessage
---

# all-channel-broadcast

A broadcast bot. When an authorized member types `/announce <text>` in any channel, the bot enumerates every text channel in the community and posts the announcement to each one. Reach for this sample when you need a fan-out pattern — one trigger, many targets — gated by an admin-configured allowlist.

## What it demonstrates

- Reading a manifest-declared `roleOrMember` setting (`rootServer.globalSettings.general.announcers`) and using `ReadOnlyMemberGroup.isMember` to authorize the caller before doing any work.
- Walking the channel tree by listing channel groups (`rootServer.community.channelGroups.list`) and then each group's channels (`rootServer.community.channels.list`), filtering by `ChannelType.Text`.
- Fanning out a message to many channels with `rootServer.community.channelMessages.create`, wrapping each send in its own `try/catch` so one failure (rate-limit, missing permission on a single channel) doesn't abort the rest.
- Building a user mention with the `[@nickname](root://user/<id>)` URI scheme so the announcer is properly linked in each post.

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

