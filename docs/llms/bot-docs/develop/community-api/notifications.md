---
path: bot-docs/develop/community-api/notifications.md
audience: bot
category: guide
summary: Alert specific members about something that happened in your app, or show a lightweight activity indicator to the whole community.
---

# Notifications

Alert specific members about something that happened in your app, or show a lightweight activity indicator to the whole community.

## What are notifications?

A *notification* tells a member that something relevant to them happened while they were not looking. Root delivers a notification two ways at once:

- **In-app**: the notification appears in the member's notification list inside Root.
- **Push**: the platform sends a device push notification.

Both come from a single call. You do not choose between them.

Your code accesses notifications through `rootServer.community.notifications`, which provides two distinct mechanisms:

| Mechanism | Targeted at | Sends push? | Typical use |
|-----------|-------------|-------------|-------------|
| `send` | Specific members | Yes | Something happened that a named person is waiting on |
| `setActivity` | The whole community | No | Something changed and the app channel is worth a look |

Pick `send` when you can name the people who care. Pick `setActivity` when you cannot, or when the event is not worth interrupting anyone about.

## Send a notification

`NotificationClient.send` takes a `NotificationSendRequest` and resolves when the notification has been created.

```ts
await rootServer.community.notifications.send({
  title: "New comment on your suggestion",
  description: "Ada replied to \"Dark mode for the sidebar\"",
  userIds: [authorUserId],
  relativeUrl: `/board/${boardId}/suggestion/${suggestionId}`,
});
```

### Content fields

| Field | Required | Limit | Notes |
|-------|----------|-------|-------|
| `title` | Yes | 50 characters | Shown as the notification headline |
| `description` | No | 150 characters | Shown as the body |
| `relativeUrl` | No | 1000 characters | Must be a relative URL. See [Deep links](#deep-links) |

Exceeding any limit rejects the entire request, so truncate your own strings before you send. A user-supplied title pasted straight into the `title` field is the most common cause of a rejected notification.

### Target fields

You can target members three ways, and you can combine them in a single call:

| Field | Type | Resolves to |
|-------|------|-------------|
| `userIds` | `UserGuid[]` | Exactly those members |
| `communityRoleIds` | `CommunityRoleGuid[]` | Every member holding any of those roles |
| `memberGroupId` | `CustomMemberGroupGuid` | Every member of that member group |

The SDK resolves roles and member groups into user IDs on your server, merges all three sources into a single set, and sends only user IDs to the platform. Because the set is deduplicated, a member who appears in `userIds` and also holds a targeted role receives one notification, not two.

`communityId` is optional. Single-tenant apps and bots can omit it, and the SDK uses the community the code is running for. Multi-tenant apps must pass it explicitly.

### Target limits

Two boundaries matter, and they fail in opposite ways:

- **More than 1000 resolved users throws.** The SDK counts the merged set before sending and throws if it exceeds 1000. This is a client-side check, so it happens whether the users came from `userIds` or from a large role.
- **Zero resolved users returns silently.** A notification aimed at a role nobody holds, or an empty member group, resolves to nothing and the call succeeds without sending anything. No error is raised.

The silent zero case is the one that costs debugging time. Log your own resolved recipient count so that "nobody was notified" is visible in your logs rather than indistinguishable from success.

### Batch large audiences

Because the 1000-user ceiling throws, notifying a larger audience means splitting your own resolved user IDs across several calls.

When you do, attach role and member group targets to exactly one of those calls. Roles and member groups are re-resolved on every call, so passing `communityRoleIds` alongside each batch notifies every member of that role once per batch.

```ts
const BATCH_SIZE = 1000;

for (let start = 0; start < userIds.length; start += BATCH_SIZE) {
  await rootServer.community.notifications.send({
    title,
    description,
    userIds: userIds.slice(start, start + BATCH_SIZE),
    // Group targets ride on the first batch only, never on every batch.
    communityRoleIds: start === 0 ? communityRoleIds : undefined,
  });
}
```

## Deep links

`relativeUrl` makes the notification open a specific place in your app when the member taps it. Without it, tapping the notification opens your app wherever it happens to be.

The URL is resolved against your app's own router, and it must include every parent route segment, not just the leaf path. A route defined with `path: '/task/$taskId'` that is a child of a project route is not reachable at `/task/123`. The working link is `/project/456/task/123`.

Follow the `getParentRoute` chain in your router when you build the link. Reading the `path` string alone produces a link that validates, sends, delivers, and then lands the member on your app's not-found screen.

Two further constraints:

- The URL must parse as a relative URL. Absolute URLs are rejected.
- **Your code must hold a channel in the community.** If it does not, passing `relativeUrl` fails the entire send with `RootApiException` and `errorCode` set to `NoPermissionToCreate`. The notification is not delivered without its link, it is not delivered at all. If your code may run without a channel, retry the send without `relativeUrl` rather than losing the message.

Bots have no client interface to open, so `relativeUrl` does not apply to them.

## Set community activity

`NotificationClient.setActivity` marks your app's channel as recently active. It shows an activity indicator to the community, targets nobody, and sends no push.

```ts
await rootServer.community.notifications.setActivity({});
```

It is the low-cost counterpart to `send`. Nothing is delivered to a device, nothing appears in a notification list, and there is no audience to get wrong. Use it for events that make the app worth a visit but are not worth interrupting a specific person about, such as a new post on a shared board.

Two behaviors to plan for:

- **The platform debounces to one call per second.** Calls arriving inside a second of the last recorded activity are dropped and return successfully. You do not need to throttle it yourself.
- **Your code must hold a channel.** Without one, the call throws `RootApiException` with `errorCode` set to `NotFound`. This makes `setActivity` unavailable to bots that hold no channel.

## Delivery behavior

Understanding what happens after `send` resolves explains most surprising test results.

1. The platform creates the in-app notification for every targeted member.
2. The platform sends a device push to **offline members only**. Members currently connected to Root get the in-app notification instead.
3. Members who have blocked your code are filtered out.

The offline rule matters for testing. Opening a second browser tab signed in as your test recipient exercises the in-app path and will never produce a push. Testing the push path needs a second account that is genuinely signed out.

## Permissions

Sending a notification requires no manifest permission. The platform authorizes the call on two facts: the caller is an app or bot, and it is installed in the target community.

There is nothing to declare in your manifest and nothing for a community leader to grant. The corollary is that members cannot currently silence one app's notifications short of uninstalling it, so treat the absence of a permission gate as a reason for restraint rather than a license. Notify a member when something is genuinely waiting on them, and use `setActivity` for everything else.

## Error handling

`send` and `setActivity` both throw `RootApiException` on failure. The most common causes:

| Cause | `errorCode` |
|-------|-------------|
| `relativeUrl` passed while holding no channel | `NoPermissionToCreate` |
| `setActivity` called while holding no channel | `NotFound` |
| Code not installed in the target community | `NotMemberOf` |

The client-side 1000-user ceiling throws a plain `Error` rather than a `RootApiException`, because the SDK rejects it before contacting the platform.

Treat notifications as best effort. A failed notification should never fail the user action that triggered it, so send outside the path that returns the user's result and catch everything:

```ts
void rootServer.community.notifications
  .send(request)
  .catch((error) => console.error("Notification failed", error));
```

See [Error handling](error-handling.md) for the general exception model.

## When to use notifications

Use `send` when a specific member is waiting on something:

- **Direct assignment**: a task assigned to them, a review requested from them
- **Replies**: a comment on their post, a reply to their comment
- **Status changes on something they own**: their suggestion accepted, their submission approved
- **Time-based reminders**: an event they signed up for starts soon

Use `setActivity` when the event is community-wide and nobody in particular is waiting:

- New shared content that anyone might want to see
- Periodic refreshes of a leaderboard or dashboard

Avoid notifying:

- **The member who caused the event.** Exclude the acting user from your target set. A member who assigns a task to themselves should not be told about it.
- **On every change.** Batch or debounce noisy events rather than sending a notification per keystroke or per vote.
- **Anything sensitive.** Notification content appears on a lock screen. Do not include private message content, moderation details, or anything you would not show in a public channel.