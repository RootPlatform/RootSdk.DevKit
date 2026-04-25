---
path: app-docs/develop/server/community-api/mentions/read-mentions.md
audience: app
category: guide
summary: Extract mention data from messages your code receives to identify referenced users, roles, and channels.
---

> **Worked sample**: `api-samples/server-messages/` — Channel Messages

# Read mentions

Extract mention data from messages your code receives to identify referenced users, roles, and channels.

## Message properties

When you receive a message, three properties contain mention-related information:

| Property | Type | Description |
|----------|------|-------------|
| `messageContent` | `string` | Raw message text with `root://` URIs in Markdown link format |
| `messageUris` | `MessageUri[]` | Extracted URIs from the message (what was referenced) |
| `referenceMaps` | `MessageReferenceMaps` | Current display names for all mentioned entities |

## What the data looks like

Given a message with this content:

```
Hey [@Alice](root://user/abc123), check out [#Announcements](root://channel/def456)!
```

The `messageUris` array contains each extracted URI:

```ts
[
  { uri: "root://user/abc123" },
  { uri: "root://channel/def456" }
]
```

The `referenceMaps` contains the current names for those entities:

```ts
{
  users: [{ userId: "abc123", name: "Alice" }],
  channels: [{ channelId: "def456", name: "Announcements" }]
}
```

If Alice changed her display name to "Alicia", the `messageContent` would still show `[@Alice]`, but `referenceMaps.users` would show `{ userId: "abc123", name: "Alicia" }`.

## Why referenceMaps exists

The `messageUris` array tells you *what* was mentioned (via IDs in the URIs), but not the current names. The `messageContent` has display text, but it's frozen from when the message was sent. If you need to show Alice's current name but she renamed herself to "Alicia", you'd have to make an API call to look it up.

The `referenceMaps` property saves you that work. When the server delivers a message to your code, it resolves each mention URI to the entity's current display name. This lets you:

- Show current names in logs or responses
- Look up mentioned users without extra API calls
- Match mentions against current usernames

## The referenceMaps structure

```ts
type MessageReferenceMaps = {
  users?: MessageReferenceMapUser[];       // Mentioned users
  channels?: MessageReferenceMapChannel[]; // Mentioned channels
  roles?: MessageReferenceMapCommunityRole[]; // Mentioned roles (including @All/@Here)
  imageAssets?: { [uri: string]: AssetImage };      // Image metadata
  assets?: { [uri: string]: AssetInformation };     // File attachment metadata
}
```

Each array contains entries with IDs and current names:

```ts
// User entry
{ userId: "abc123", name: "Alicia" }

// Channel entry
{ channelId: "def456", name: "General" }

// Role entry
{ communityRoleId: "ghi789", name: "Moderators" }
// For @All: { communityRoleId: "All", name: "All" }
// For @Here: { communityRoleId: "Here", name: "Here" }
```

## Examples

### Find mentioned users

```ts
import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
} from "@rootsdk/server-app";

function handleMessage(evt: ChannelMessageCreatedEvent): void {
  if (!evt.referenceMaps?.users?.length) {
    return;
  }

  for (const user of evt.referenceMaps.users) {
    console.log(`Mentioned user: ${user.name} (${user.userId})`);
  }
}

rootServer.community.channelMessages.on(
  ChannelMessageEvent.ChannelMessageCreated,
  handleMessage
);
```

### Find mentioned channels

```ts
function handleMessage(evt: ChannelMessageCreatedEvent): void {
  if (!evt.referenceMaps?.channels?.length) {
    return;
  }

  for (const channel of evt.referenceMaps.channels) {
    console.log(`Mentioned channel: #${channel.name} (${channel.channelId})`);
  }
}
```

### Find mentioned roles

```ts
function handleMessage(evt: ChannelMessageCreatedEvent): void {
  if (!evt.referenceMaps?.roles?.length) {
    return;
  }

  for (const role of evt.referenceMaps.roles) {
    console.log(`Mentioned role: @${role.name} (${role.communityRoleId})`);
  }
}
```

### Check for external links

Use `messageUris` to check for content types that aren't in `referenceMaps`, like external URLs:

```ts
function hasExternalLinks(evt: ChannelMessageCreatedEvent): boolean {
  return evt.messageUris?.some(
    (uri) => uri.uri.startsWith("https://") || uri.uri.startsWith("http://")
  ) ?? false;
}
```

### Check for @All or @Here

```ts
function hasAllMention(evt: ChannelMessageCreatedEvent): boolean {
  return evt.messageUris?.some(
    (uri) => uri.uri.toLowerCase() === "root://role/all"
  ) ?? false;
}

function hasHereMention(evt: ChannelMessageCreatedEvent): boolean {
  return evt.messageUris?.some(
    (uri) => uri.uri.toLowerCase() === "root://role/here"
  ) ?? false;
}
```

### Check if a specific user is mentioned

```ts
function isMentioned(
  evt: ChannelMessageCreatedEvent,
  targetUserId: UserGuid
): boolean {
  if (!evt.referenceMaps?.users?.length) {
    return false;
  }

  return evt.referenceMaps.users.some(
    (user) => user.userId === targetUserId
  );
}
```