---
path: app-docs/develop/server/community-api/community-emojis.md
audience: app
category: guide
summary: Manage custom emojis that members use in community messages.
---

# Community emojis

Manage custom emojis that members use in community messages.

## What are community emojis?

A community emoji is a custom image uploaded to a community and identified by a unique shortcode. Members reference community emojis by shortcode in messages, and the platform renders the associated image inline.

Each community emoji has three components:

- An **ID**: a unique identifier for the emoji automatically assigned by Root
- A **shortcode**: a text label like `:team-logo:` that members choose when they create the custom emoji
- An **asset URI**: the location of the uploaded image automatically assigned by Root

Shortcodes are unique within a community. Each community has a maximum number of custom emojis it can store.

```ts
// CommunityEmoji structure
{
  id: EmojiGuid,
  shortcode: string,
  assetUri: string
}
```

## How community emojis work

Understanding the emoji lifecycle helps your code react to changes and keep any local emoji state in sync.

Community emojis are created by members with the `manageEmojis` permission through the community settings interface. The SDK does not expose a create method; your code can list, retrieve, and delete existing emojis.

When an emoji is created or deleted, the server emits real-time events (`communityEmoji.created` and `communityEmoji.deleted`) to all connected clients, including your code. Subscribe to these events on `CommunityEmojiClient` to keep your code's state up to date without polling.

### Embed community emojis in message content

To include a community emoji in a message, use Markdown link syntax with a `root://emoji/` URI. This is the same link pattern used for [mentions](mentions/create-mentions.md). The URI includes the shortcode (without colons) and the emoji ID as path segments:

```
[:shortcode:](root://emoji/shortcode/emojiId)
```

For example, to send a message containing a community emoji with shortcode `team-logo`:

```ts
// Assume you've retrieved the emoji via communityEmojis.list() or a CommunityEmojiCreated event
const emoji: CommunityEmoji = { id: emojiId, shortcode: "team-logo", assetUri: "..." };

const request: ChannelMessageCreateRequest = {
  channelId: channelId,
  content: `Welcome to the team! [:${emoji.shortcode}:](root://emoji/${emoji.shortcode}/${emoji.id})`,
};

await rootServer.community.channelMessages.create(request);
```

Root clients parse these links and render the corresponding emoji image inline.

Standard (built-in) emojis use a simpler URI with just the shortcode wrapped in colons and no ID segment: `[:thumbsup:](root://emoji/:thumbsup:)`.

### Parse community emojis from message content

When you read a message via `channelMessages.get()` or `channelMessages.list()`, community emojis appear in the `messageContent` string as Markdown links with `root://emoji/` URIs.

You can distinguish community emojis from standard emojis by the URI structure:

| Type | URI format | Example |
|------|-----------|---------|
| Standard | `root://emoji/:shortcode:` | `root://emoji/:thumbsup:` |
| Community | `root://emoji/shortcode/emojiId` | `root://emoji/team-logo/550e8400-...` |

Community emoji URIs have two path segments (shortcode without colons, then the emoji GUID). Standard emoji URIs have one path segment (shortcode with colons).

### Use community emojis as reactions

Reactions use a different format from message content. Instead of Markdown links, reactions use a colon-delimited shortcode string.

For standard emojis, the shortcode has two colons:

```
:thumbsup:
```

For community emojis, the shortcode has three colons, with the emoji ID between the second and third:

```
:team-logo:550e8400-e29b-41d4-a716-446655440000:
```

To add a community emoji reaction:

```ts
const emoji: CommunityEmoji = { id: emojiId, shortcode: "team-logo", assetUri: "..." };

await rootServer.community.channelMessages.reactionCreate({
  channelId,
  messageId,
  shortcode: `:${emoji.shortcode}:${emoji.id}:`,
});
```

When you read a message's `reactions` array or handle a `ChannelMessageReactionCreated` event, the `shortcode` field uses the same format. To determine whether a reaction is a community emoji, check for three colons: if the value starts and ends with `:` and contains a third `:` separating the shortcode from a GUID, it is a community emoji.

## When to use community emojis

- **React to new emojis**: Listen for `CommunityEmojiCreated` events to update local caches, trigger notifications, or log emoji additions.
- **Build emoji directories**: Call `list()` to retrieve all community emojis and present them in a custom interface or search tool.
- **Moderate emoji content**: Use `delete()` to remove emojis that violate community guidelines when your code detects policy violations.