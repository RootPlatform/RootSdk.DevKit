---
path: app-docs/develop/server/community-log.md
audience: app
category: guide
summary: Send diagnostic messages from your app server to the administrators of a Root community.
---

> **Worked sample**: `api-samples/server-community-logs/` — Community Logs

# Community log

Send diagnostic messages from your app server to the administrators of a Root community.

## What is the community log?

The community log is a persistent, admin-visible log that helps community administrators understand what's happening in your app. Each community has its own log, and messages are retained for 90 days.

Log entries have a severity level and a message:

| Level   | Purpose                                                   |
| ------- | --------------------------------------------------------- |
| `Info`  | Routine events and status updates                         |
| `Warn`  | Potentially problematic situations that don't block operation |
| `Error` | Failures that affect specific operations but allow the app to continue |
| `Fatal` | Critical failures that may prevent the app from functioning |

## How the community log works

When your app writes to the community log, Root stores the entry and makes it visible to community members who have the **Manage Apps** permission. The log appears inside the Root client, not the Developer Portal.

Community administrators can use these logs to:
- Understand why your app behaved a certain way
- Diagnose issues reported by community members
- Verify that your app is functioning correctly

Messages are not visible to you as the developer. If you need logs for your own debugging, use standard console logging or your own logging infrastructure.

## When to use the community log

- **Report recoverable errors.** When your app encounters a problem but continues operating, log it so administrators know something went wrong.
- **Explain automated actions.** If your app takes action based on rules or conditions, log why it did so.
- **Surface configuration issues.** When required settings are missing or invalid, warn administrators so they can fix them.
- **Record critical failures.** If your app cannot function due to an unrecoverable error, log a fatal message before shutting down.

## Writing to the community log

Access the community log client via `rootServer.dataStore.logs.community`. Call the `create` method with a request containing the severity level and message.

```ts
import { rootServer, CommunityAppLogType } from "@rootsdk/server";

await rootServer.dataStore.logs.community.create({
  communityAppLogType: CommunityAppLogType.Warn,
  message: "No new-member role configured. Using default role."
});
```