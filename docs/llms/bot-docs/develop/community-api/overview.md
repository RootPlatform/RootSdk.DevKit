---
path: bot-docs/develop/community-api/overview.md
audience: bot
category: guide
summary: The community access API lets your server code read and modify the community where it's installed.
---

# Community access overview

The community access API lets your server code read and modify the community where it's installed.

## What is community access?

*Community access* is the part of the Root API that enables your server code to interact with community resources (channels, messages, members, roles, and more). Think of your server code like a community member: it can do almost everything a human can do within the community, subject to the same permission rules.

The API is organized around *clients*, each responsible for a specific resource type. For example, `ChannelClient` handles channel operations, while `CommunityMemberClient` handles member operations.

## How community access works

Your server accesses community resources through `rootServer.community`, which provides specialized clients for each resource type:

- **Community settings**: Read and update community name, picture, default channel, and membership policies
- **Channels and groups**: Create, edit, move, and delete channels and channel groups
- **Messages**: Post messages, add reactions, pin content, manage typing indicators
- **Members**: Look up member information, kick or ban users, manage invites
- **Roles**: Create and assign roles, manage role permissions
- **Files**: Upload and manage files in channels
- **Notifications**: Alert specific members, or mark your channel as active for the community

Each client provides two capabilities:

1. **Methods**: CRUD operations (create, get, list, edit, delete) that let you manipulate resources
2. **Events**: Notifications when resources change, letting you react to activity from any source

## When to use community access

Use community access when you need to:

- **Member management**: Track member joins and departures, and automatically promote users when they hit milestones. Set up onboarding flows with checklists, starter roles, and welcome messages. Add XP systems that reward participation.
- **Events and coordination**: Post reminders for upcoming events and tag roles automatically. Let members RSVP with reactions or commands, and log attendance for rewards.
- **Messaging and content**: Create temporary channels on schedule and clean them up automatically. Pin popular messages based on reactions. Enable polls and track results via emoji reactions.
- **Moderation and safety**: Auto-delete rule-breaking messages and issue warnings or kicks based on filters. Track repeat offenses and auto-ban after a set number of strikes. Flag suspicious join activity to catch raids, and configure join throttling to limit rapid member influx.

Your code runs with permissions just like a human member. To create a channel, you need the **Manage Channel** permission. To kick a member, you need the **Kick Members** permission. Plan your required permissions based on the operations you need to perform.

### Limitations

Your code cannot:

- Respond to community join invites
- Interact with Friends lists