---
kind: sample-bot
description: Send a platform notification to a member
complexity: minimal
key_patterns:
  - notifications
  - best-effort side effects
  - field length limits
permissions: []
---

# notifications

A notification bot. It answers `/notifyme <text>` by sending a platform notification back to the member who typed it. Reach for this sample as the smallest working example of `rootServer.community.notifications.send`, and as the reference for the three behaviours of that API that are easy to get wrong.

## What it demonstrates

- Sending a notification with `rootServer.community.notifications.send`, passing `title`, `description` and a `userIds` array.
- Truncating `title` to 50 characters and `description` to 150 before sending. The platform rejects the entire request when either field is too long, so the sample trims up front rather than handling a failure afterwards.
- Treating a notification as best effort. The send is wrapped in its own `try`/`catch` so that a notification failure can never break the action that triggered it. A notification is a side effect of the real work, not the work itself.
- Making a delivery to nobody visible. `send` returns without raising when `userIds` resolves to zero recipients, so a notification aimed at an empty set vanishes silently. The sample logs the recipient count before sending, which is what turns that silence into something a developer can see.
- Resolving the sender's nickname with `rootServer.community.communityMembers.get` so the notification title names the member.

## Permissions

This bot declares no permissions. Notifying is not a declarable capability: any installed app or bot can notify any member of a community it is installed in, and there is nothing to request in the manifest.

```json
{}
```

## Running it

Send `/notifyme take out the bins` in any channel the bot can see. The notification arrives on the sender's own account, which makes the sample testable with a single user and no second device.
