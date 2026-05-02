---
kind: api-sample
category: server-community-api
description: Send messages, add reactions, pin messages, mention users, and flag content in text channels
domain: Channel messages
key_methods: [send, reply, edit, delete, list, reactions, pins, mentions, flag]
---

# API Sample: Channel Messages

How to send messages, add reactions, pin messages, mention users, and flag content in text channels.

## Source Files

| File | What it covers |
|------|---------------|
| [send.ts](src/send.ts) | Create, reply, get, edit, delete, list messages; typing indicator |
| [reactions.ts](src/reactions.ts) | Add, remove, and bulk-remove emoji reactions |
| [pins.ts](src/pins.ts) | Pin, unpin, and list pinned messages |
| [mentions.ts](src/mentions.ts) | Mention users, roles, and @All; read mentions via referenceMaps |
| [flag.ts](src/flag.ts) | Flag messages for moderation review |

## SDK Methods

- `channelMessages.create` — send a new message (supports replies via `parentMessageIds`)
- `channelMessages.get` — retrieve a message by ID
- `channelMessages.edit` — edit message content
- `channelMessages.delete` — delete a message
- `channelMessages.list` — list messages in a channel (limit 10–50, default 50; supports Older/Newer/Both directions)
- `channelMessages.setTypingIndicator` — show/hide typing indicator
- `channelMessages.setViewTime` — mark channel as read (set read-receipt / view timestamp)
- `channelMessages.reactionCreate` — add an emoji reaction
- `channelMessages.reactionDelete` — remove your own reaction
- `channelMessages.reactionDeleteFull` — remove ALL reactions of a given emoji (moderation)
- `channelMessages.pinCreate` — pin a message
- `channelMessages.pinDelete` — unpin a message
- `channelMessages.pinList` — list pinned messages
- `channelMessages.flag` — flag a message for moderation

## Permissions

Required in `root-manifest.json`:

```json
{
  "permissions": {
    "channel": {
      "createMessage": true,
      "createMessageMention": true,
      "createMessageReaction": true,
      "managePinnedMessages": true,
      "deleteMessageOther": true
    }
  }
}
```

- `createMessage` — send messages
- `createMessageMention` — mention @All, @Here, or non-mentionable roles
- `createMessageReaction` — add, remove, and bulk-remove reactions
- `managePinnedMessages` — pin and unpin messages
- `deleteMessageOther` — delete messages sent by others

## Events

| Event | Fires when |
|-------|-----------|
| `ChannelMessageCreated` | Another user sends a message (not your own) |
| `ChannelMessageEdited` | Another user edits a message (not your own edits) |
| `ChannelMessageDeleted` | Another user deletes a message (not your own deletes) |
| `ChannelMessageReactionCreated` | Another user adds a reaction (not your own) |
| `ChannelMessageReactionDeleted` | Another user removes a reaction (not your own) |
| `ChannelMessageReactionDeletedFull` | All reactions of an emoji are bulk-removed from a message |
| `ChannelMessagePinCreated` | Another user pins a message (not your own) |
| `ChannelMessagePinDeleted` | Another user unpins a message (not your own) |
| `ChannelMessageSetTypingIndicator` | Another user starts/stops typing (not your own) |

## Apps vs Bots

This api sample is hosted in a bot for simplicity, but all code works in both apps and bots. The only difference is the import:

- **Bots**: `import { ... } from "@rootsdk/server-bot"`
- **Apps**: `import { ... } from "@rootsdk/server-app"`

All SDK methods, event subscriptions, types, and error handling are identical.

## Key Behaviors

- You do not receive events for your own actions — message, reaction, pin, and typing events only fire for other users
- Edit only works on your own messages (no permission required)
- Delete your own messages without permission; `deleteMessageOther` to delete others'
- `reactionDelete` removes only your own reactions; `reactionDeleteFull` removes ALL users' reactions for an emoji (moderation)
- You can pin/unpin any message (not just your own)
- Message content supports CommonMark markdown
- Maximum message length: 10,001 characters
- Mentions use `root://` URI scheme: `[@Name](root://user/<id>)` and `[@Role](root://role/<id>)`
- Use `referenceMaps` on message events to read resolved mentions (preferred over regex parsing)
- Replies use `parentMessageIds` array — can reply to multiple messages at once
- Reply notifications are off by default — set `needsParentMessageNotification: true` to notify
- Flagging queues a message for moderator review — it does not remove or hide the message
- `list` accepts a `limit` parameter (10–50, default 50) and returns `oldCount`/`newCount` for pagination
- `list` supports three directions: `Older` (history), `Newer` (catch-up), `Both` (initial load / jump-to-date)
- To paginate, extract the timestamp from the last message's ID via `RootGuidUtils.toMilliseconds()` and pass it as `dateAt` for the next request
- Commands are rate-limited to ~5 requests/second
- Emoji shortcodes use standard `:shortcode:` names (e.g., `:thumbsup:`, `:heart:`, `:tada:`). For lookups, see [iamcal/emoji-data](https://github.com/iamcal/emoji-data) or the [GitHub Emoji API](https://api.github.com/emojis)
