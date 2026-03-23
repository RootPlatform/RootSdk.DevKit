# How-To: Channel Messages

How to send messages, add reactions, pin messages, mention users, and flag content in text channels.

## Source Files

| File | What it covers |
|------|---------------|
| [send.ts](src/send.ts) | Create, reply, get, edit, delete, list messages; typing indicator |
| [reactions.ts](src/reactions.ts) | Add and remove emoji reactions |
| [pins.ts](src/pins.ts) | Pin, unpin, and list pinned messages |
| [mentions.ts](src/mentions.ts) | Mention users, roles, and @All; read mentions via referenceMaps |
| [flag.ts](src/flag.ts) | Flag messages for moderation review |

## SDK Methods

- `channelMessages.create` — send a new message (supports replies via `parentMessageIds`)
- `channelMessages.get` — retrieve a message by ID
- `channelMessages.edit` — edit message content
- `channelMessages.delete` — delete a message
- `channelMessages.list` — list messages in a channel
- `channelMessages.setTypingIndicator` — show/hide typing indicator
- `channelMessages.reactionCreate` — add an emoji reaction
- `channelMessages.reactionDelete` — remove a reaction
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
- `createMessageReaction` — add and remove reactions
- `managePinnedMessages` — pin and unpin messages
- `deleteMessageOther` — delete messages sent by others

## Events

| Event | Fires when |
|-------|-----------|
| `ChannelMessageCreated` | Any message is sent |
| `ChannelMessageEdited` | Any message is edited |
| `ChannelMessageDeleted` | Any message is deleted |
| `ChannelMessageReactionCreated` | Any reaction is added |
| `ChannelMessageReactionDeleted` | Any reaction is removed |
| `ChannelMessagePinCreated` | Any message is pinned |
| `ChannelMessagePinDeleted` | Any message is unpinned |
| `ChannelMessageSetTypingIndicator` | Any user starts/stops typing |

## Apps vs Bots

This how-to is hosted in a bot for simplicity, but all code works in both apps and bots. The only difference is the import:

- **Bots**: `import { ... } from "@rootsdk/server-bot"`
- **Apps**: `import { ... } from "@rootsdk/server-app"`

All SDK methods, event subscriptions, types, and error handling are identical.

## Key Behaviors

- Edit only works on your own messages (no permission required)
- Delete your own messages without permission; `deleteMessageOther` to delete others'
- You can only remove your own reactions (not reactions by other users)
- You can pin/unpin any message (not just your own)
- Message content supports CommonMark markdown
- Maximum message length: 10,001 characters
- Mentions use `root://` URI scheme: `[@Name](root://user/<id>)` and `[@Role](root://role/<id>)`
- Use `referenceMaps` on message events to read resolved mentions (preferred over regex parsing)
- Replies use `parentMessageIds` array — can reply to multiple messages at once
- Reply notifications are off by default — set `needsParentMessageNotification: true` to notify
- Flagging queues a message for moderator review — it does not remove or hide the message
- Commands are rate-limited to ~5 requests/second
