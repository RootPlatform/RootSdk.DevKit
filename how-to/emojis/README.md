# How-To: Emojis

Get, list, and delete custom community emojis.

## Source Files

| File | What it covers |
|------|---------------|
| [emojis.ts](src/emojis.ts) | Get, list, delete emojis; handle emoji created/deleted events |

## SDK Methods

- `communityEmojis.get(request)` — retrieve a single emoji by ID
- `communityEmojis.list()` — list all custom emojis in the community
- `communityEmojis.delete(request)` — delete an emoji by ID

## Permissions

```json
{
  "community": {
    "manageEmojis": true
  },
  "channel": {
    "createMessage": true
  }
}
```

- `community.manageEmojis` — required for delete; get and list require no special permissions
- `channel.createMessage` — only for the `/emojis` command trigger

## Events

| Event | Fires when |
|-------|-----------|
| `CommunityEmojiEvent.CommunityEmojiCreated` | A custom emoji is added to the community |
| `CommunityEmojiEvent.CommunityEmojiDeleted` | A custom emoji is removed from the community |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **No create method in the SDK** — emojis are created through the Root platform UI or test harness (community-builder). The `/emojis` command requires pre-existing emojis.
- **Shortcodes in messages and reactions** — use `:shortcode:` syntax in message content and when creating reactions.
- **Multiple emojis can share the same assetUri** — different shortcodes can point to the same image.
- **Delete is idempotent** — deleting an already-deleted emoji succeeds without error.
- **Event testing** — to trigger `CommunityEmojiCreated`, create an emoji via the Root platform UI or test harness while your code is running.
