---
path: app-docs/develop/server/community-api/mentions/overview.md
audience: app
category: guide
summary: Notify users, reference roles, and link to channels directly within message content.
---

> **Worked sample**: `api-samples/server-messages/` — Channel Messages

# Mentions overview

Notify users, reference roles, and link to channels directly within message content.

## What are mentions?

A *mention* is a special link in a message that references a user, role, or channel. When displayed in the Root client, mentions appear as highlighted, clickable text. User and role mentions can also trigger notifications.

| Type | Purpose | URI format | Permission required |
|------|---------|------------|---------------------|
| User | Notify a specific user | `root://user/{userId}` | No |
| Role | Reference a role | `root://role/{roleId}` | No |
| Channel | Link to a channel | `root://channel/{channelId}` | No |
| `@All` | Notify all channel members | `root://role/All` | Yes |
| `@Here` | Notify online members | `root://role/Here` | Yes |

## How mentions work

Mentions use a URI-based system that separates *what* is referenced from *how* it's displayed.

### Storage

Messages are stored in Root's server, not sent directly between users. A message might be retrieved days or weeks after it was created.

Mentions store two pieces of information:

- **Display text**: What you write (like `@Alice`). Root clients show this exactly as stored. If the user later changes their name, the mention still shows the original text.
- **URI**: A stable identifier (like `root://user/{userId}`) that never changes. It's used for actions like navigating to a profile or determining if a mention refers to the current user.

### Resolution

When your code receives a message, the server includes a `referenceMaps` property with the current display names for all mentioned entities:

- `users`: User IDs mapped to current display names
- `channels`: Channel IDs mapped to current channel names
- `roles`: Role IDs mapped to current role names (including `@All` and `@Here`)

This lets your code determine current names without making additional API calls. For the full `referenceMaps` structure, see [Read mentions](read-mentions.md).

## When to use mentions

| Mention type | Use case | Example |
|--------------|----------|---------|
| User | Alert a specific person | Notify a user when their request completes |
| Role | Reference a group | Flag that a task needs moderator review |
| Channel | Create navigation links | Point users to a help channel |
| `@All` | Announce to everyone | Broadcast a server maintenance notice |
| `@Here` | Alert online members | Notify about a time-sensitive event |

`@All` and `@Here` require the `createMessageMention` permission.