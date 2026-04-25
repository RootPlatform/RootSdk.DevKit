---
path: bot-docs/develop/community-api/channels.md
audience: bot
category: guide
summary: Organize community content into channels and group related channels together.
---

> **Worked sample**: `api-samples/server-channels/` — Channels

# Channels and channel groups

Organize community content into channels and group related channels together.

## What are channels and channel groups?

A *channel* is a container for content within a community. All messages, files, and real-time activity happen inside channels. Every channel belongs to exactly one *channel group*, which organizes related channels and can define shared permission settings.

[Diagram: Diagram showing channel groups containing channels of different types.]
```
flowchart TD
  C[Community]
  C --> G1[Channel Group: General]
  C --> G2[Channel Group: Gaming]
  G1 --> CH1["#welcome (Text)"]
  G1 --> CH2["#chat (Text)"]
  G1 --> CH3["#lounge (Voice)"]
  G2 --> CH4["#lfg (Text)"]
  G2 --> CH5["#voice-chat (Voice)"]
  G2 --> CH6["#leaderboard (App)"]
```

### Channel types

Every channel has a type that determines its behavior:

| Type | Description |
|------|-------------|
| `Text` | Standard text channel for messages, files, and reactions |
| `Voice` | Real-time audio channel where members can join and talk |
| `App` | Hosts a community app; displays the app's UI instead of messages |

Specify the type when creating a channel. The type cannot be changed after creation.

```ts
// Create a text channel
const textChannel = await rootServer.community.channels.create({
  channelGroupId: groupId,
  name: 'announcements',
  channelType: ChannelType.Text
});

// Create a voice channel
const voiceChannel = await rootServer.community.channels.create({
  channelGroupId: groupId,
  name: 'team-chat',
  channelType: ChannelType.Voice
});
```

### Channel groups

Channel groups serve two purposes:

1. **Organization**: Group related channels visually in the community sidebar
2. **Permissions**: Define default permissions that channels can inherit

A channel group has a name and an optional set of access rules. When you create channels within the group, they can either inherit the group's permissions or define their own.

## How channels and channel groups work

Understanding the relationship between channels and groups helps you design permission structures and organize content effectively.

### Permission inheritance

Each channel has a `useChannelGroupPermission` property that controls where its permissions come from:

| Value | Behavior |
|-------|----------|
| `true` | Channel inherits permissions from its parent channel group |
| `false` | Channel uses its own access rules; group permissions don't apply |

This is an either/or choice. There's no cascading where both group and channel rules combine.

When a channel inherits from its group, any access rules defined directly on the channel are ignored. To customize permissions for a single channel while keeping it in the group, set `useChannelGroupPermission: false` and define access rules on the channel itself.

For details on how access rules work, see [Access rules](access-rules.md).

### Ordering and position

Both channel groups and channels within groups have positions that determine their display order in the community sidebar. The API uses a "place after" positioning model with `beforeChannelGroupId` and `beforeChannelId`:

- **Place first**: Omit `beforeChannelGroupId` or `beforeChannelId` (or set to `null`). The item is inserted at the top of the list.
- **Place after a specific item**: Set `beforeChannelGroupId` or `beforeChannelId` to the item that the moved item should follow. The moved item is inserted immediately after the referenced item.

For example, given channels ordered `A → B → C → D`, moving channel `D` with `beforeChannelId: B` produces `A → B → D → C`. `D` is pulled from its current position and inserted immediately after `B`.

When you move a channel to a different group, specify both the target `channelGroupId` and optionally a `beforeChannelId` within that group. If the channel inherits permissions from its group (`useChannelGroupPermission: true`), its permission role maps are replaced with those of the destination group.

### Deleting groups

When you delete a channel group, all channels within it are also deleted. This is a cascading delete with no recovery. If you need to preserve channels, move them to another group before deleting the original group.

## When to use channels and channel groups

- **Organize by topic**: Create channel groups like "General", "Development", "Social" to help members find relevant channels
- **Manage permissions at scale**: Define access rules on a channel group, then create channels that inherit those permissions
- **Create private spaces**: Set `useChannelGroupPermission: false` on specific channels and add access rules to restrict visibility
- **Host apps**: Create app channels to embed community apps alongside regular content channels
- **Enable voice chat**: Create voice channels for real-time audio communication between members

For file organization within text channels, see [Channel files](files.md).