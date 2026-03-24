---
path: bot-docs/debug/developer-mode.md
audience: bot
category: guide
summary: Copy entity IDs from the Root client for use in API calls and debugging.
---

# Developer mode

Copy entity IDs from the Root client for use in API calls and debugging.

## What is developer mode?

Developer mode is a client setting that adds **Copy ID** options to context menus throughout the Root client. When enabled, you can right-click on messages, users, communities, channels, and roles to copy their unique identifier to your clipboard.

### Desktop

To enable developer mode, open **Settings > Advanced** and turn on the **Developer mode** toggle.

The following IDs become available:

| Entity | Where to copy |
|--------|---------------|
| Message | Right-click a message |
| User | Right-click a user in the members list or a message |
| Community | Right-click a community in the sidebar or members panel |
| Channel | Right-click a channel in the sidebar |
| Role | Right-click a role tag |

Your own user ID is also available from **Settings > Advanced** when developer mode is enabled.

### Mobile

Developer mode is not available on mobile.

## When to use developer mode

- **Construct API calls.** Copy a channel or message ID to use as a parameter when calling the community API from your server code.
- **Report bugs.** Include entity IDs in bug reports so other developers can reproduce issues against specific resources.
- **Debug event handlers.** Compare IDs from client context menus against IDs your server receives in events to verify your code is handling the correct entities.
- **Test with specific data.** Target exact communities, channels, or users when writing integration tests or SDK examples.