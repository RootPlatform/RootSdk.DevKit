---
path: app-docs/develop/server/community-api/permission-update-events.md
audience: app
category: guide
summary: Some API operations trigger side effects that modify other resources. This article explains why this happens and how to handle it.
---

> **Worked sample**: `api-samples/server-access-rules/` — Access Rules

# Permission update events

Some API operations trigger side effects that modify other resources. This article explains why this happens and how to handle it.

## Why side effects occur

Root communities organize channels into channel groups. Channels can inherit permissions from their parent group, which means:

- When you change a channel group's permissions, every channel that inherits from it is affected
- When you delete a channel group, all its channels are deleted too
- When you modify an access rule, multiple channels and groups may have their effective permissions recalculated

This creates a challenge: a single API call can affect many resources beyond the one you targeted.

## The problem

Suppose your code calls `channelGroups.edit()` to change a channel group's permissions. Behind the scenes, Root recalculates permissions for every channel that inherits from that group. Some channels might become visible to new roles. Others might lose access for certain members.

If your code maintains any state tied to channels (scheduled messages, cached data, custom metadata), that state is now potentially stale or invalid. You need to know what changed so you can update your own data.

## The solution: event handlers

The Root API provides an `eventHandlers` parameter on methods that can trigger cascading changes. When you pass event handlers, the API calls them for each side effect before returning:

```ts
await rootServer.community.channelGroups.edit(request, {
  'channel.edited': (evt) => {
    // Called for each channel whose permissions changed
  },
  'channel.deleted': (evt) => {
    // Called for each channel that was deleted
  },
});
```

This lets you react immediately to side effects and keep your own state consistent.

## When side effects occur

Here are common scenarios that trigger cascading changes:

- **Deleting a channel group**: All channels within the group are also deleted. Your code receives `channel.deleted` events for each channel removed.

- **Deleting a channel**: If that channel was the only one your code could see in the group, your code loses visibility of the entire group. Your code receives both `channel.deleted` and `channelGroup.deleted` events.

- **Editing a channel group's permissions**: Channels that inherit permissions from the group have their effective permissions recalculated. Your code receives `channel.edited` events for affected channels.

- **Creating an access rule**: If the rule grants a role visibility to a previously hidden channel group, channels inheriting from that group become visible. Your code receives `channel.edited` events reflecting the new permissions.

- **Moving a channel to a different group**: If the channel inherits permissions from its parent group, its effective permissions change to match the new group. Your code receives a `channel.edited` event with the updated permissions.

## When do permission updates occur?

Permission update events can be triggered by operations on three clients:

| Client | Methods | Possible Side Effects |
|--------|---------|----------------------|
| `ChannelClient` | `move`, `edit`, `delete` | Channel edits/deletions, channel group deletions |
| `ChannelGroupClient` | `edit` | Channel group creations/deletions |
| `AccessRuleClient` | `create`, `edit`, `update`, `delete` | All resource types |

The `AccessRuleClient` has the broadest impact because access rules directly control permissions. Any change to an access rule can cascade throughout the permission hierarchy.

## How to handle permission updates

Pass an object with event handler callbacks to the `eventHandlers` parameter:

```ts
import {
  rootServer,
  ChannelEditRequest,
  ChannelEditedEvent,
  ChannelDeletedEvent,
} from "@rootsdk/server-app";

const request: ChannelEditRequest = {
  id: channelId,
  name: "New Name",
  // ... other properties
};

await rootServer.community.channels.edit(request, {
  'channel.edited': (evt: ChannelEditedEvent) => {
    console.log(`Channel ${evt.id} was edited as a side effect`);
  },
  'channel.deleted': (evt: ChannelDeletedEvent) => {
    console.log(`Channel ${evt.id} was deleted as a side effect`);
  },
});
```

## Available event handlers

The full set of event handlers available depends on the method being called. The complete set includes:

| Event Key | Handler Type | Description |
|-----------|--------------|-------------|
| `channel.created` | `ChannelCreatedHandler` | A channel became visible to your code |
| `channel.edited` | `ChannelEditedHandler` | A visible channel's properties or permissions changed |
| `channel.deleted` | `ChannelDeletedHandler` | A channel is no longer visible to your code |
| `channelGroup.created` | `ChannelGroupCreatedHandler` | A channel group became visible to your code |
| `channelGroup.edited` | `ChannelGroupEditedHandler` | A visible channel group's properties or permissions changed |
| `channelGroup.deleted` | `ChannelGroupDeletedHandler` | A channel group is no longer visible to your code |
| `community.permission.edited` | `CommunityPermissionEditedHandler` | Community-wide permissions changed |

## Understanding "created" and "deleted" events

The event names can be misleading. In the context of permission updates, `created` and `deleted` refer to **visibility changes**, not actual resource creation or deletion.

**What `deleted` means**: Your code receives a `channel.deleted` or `channelGroup.deleted` event when a resource is no longer visible to your code. This can happen for two reasons:

1. **The resource was actually deleted** from the community
2. **Your code lost permission** to see the resource (it still exists, but your code can no longer access it)

Your code cannot distinguish between these two cases from the event alone. In both scenarios, you should treat the resource as gone and clean up any local references.

**What `created` means**: Your code receives a `channel.created` or `channelGroup.created` event when a resource becomes visible. This can happen because:

1. **The resource was actually created** in the community
2. **Your code gained permission** to see a resource that already existed

**Why this matters**: If your code caches channel data, a `channel.deleted` event means you should remove that channel from your cache, regardless of whether the channel still exists in the community. Your code no longer has access to it either way.

## Handler invocation order

When an operation triggers multiple side effects, the API invokes handlers in a specific order:

1. `channelGroup.created`
2. `channel.created`
3. `channelGroup.edited`
4. `channel.edited`
5. `channel.deleted`
6. `channelGroup.deleted`
7. `community.permission.edited`

The API processes creations first, then edits, then deletions. Within deletions, it deletes channels before their parent groups. The `community.permission.edited` handler runs last, after all channel and channel group changes have been processed.

The API awaits each handler before calling the next one. If you register multiple handlers, they run sequentially (not concurrently). Your API call returns only after all handlers complete.

## Event handlers vs event subscriptions

Permission update events delivered via `eventHandlers` are different from events received via `.on()` subscriptions:

| Aspect | `eventHandlers` parameter | `.on()` subscription |
|--------|--------------------------|---------------------|
| **Timing** | Synchronous with your API call | Asynchronous, any time |
| **Scope** | Side effects of your operation only | All changes from any source |
| **Use case** | Update local state after your changes | React to external changes |

Use `eventHandlers` when you need to know the immediate side effects of your own operation. Use `.on()` subscriptions when you need to react to changes made by users or other apps.

## Example: Clean up scheduled messages

Suppose your code lets users schedule messages to be posted in specific channels at a future time. You store these scheduled messages in your own database, each referencing a channel ID.

When a community administrator reorganizes channel groups, channels might be deleted as a side effect. If you don't handle this, your scheduled messages will fail when they try to post to deleted channels.

```ts
import {
  rootServer,
  ChannelGroupEditRequest,
  ChannelDeletedEvent,
} from "@rootsdk/server-app";

// Your function to remove scheduled messages for a deleted channel
async function cancelScheduledMessages(channelId: string): Promise<void> {
  // Remove from your database any messages scheduled for this channel
  await db.scheduledMessages.deleteMany({ channelId });
}

// When editing a channel group, handle any channels that get deleted
const request: ChannelGroupEditRequest = {
  id: channelGroupId,
  // ... permission changes that might cascade
};

await rootServer.community.channelGroups.edit(request, {
  'channel.deleted': async (evt: ChannelDeletedEvent) => {
    await cancelScheduledMessages(evt.id);
    console.log(`Cancelled scheduled messages for deleted channel ${evt.id}`);
  },
});
```

This pattern applies whenever your code maintains state tied to specific channels or channel groups: cached permissions, custom metadata, user preferences, or any feature that references channel IDs.

## Best practices

1. **Always handle potential deletions**: If your operation might delete resources, provide handlers to clean up any local references.

2. **Keep handlers lightweight**: Event handlers run synchronously before your API call returns. Avoid heavy processing; queue work for later if needed.

3. **Consider both patterns**: For robust code, use both `eventHandlers` (for your changes) and `.on()` subscriptions (for external changes).