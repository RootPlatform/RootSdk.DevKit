# Greeter Bot

## Prompt

Build a Root bot that welcomes new members when they join the community. When a member joins the community, the bot posts a welcome message in a designated channel. The welcome message mentions the new member by their current display name.

1. The bot listens for member join events.
2. When a member joins, the bot posts a message to a preconfigured welcome channel.
3. The welcome message includes a mention of the new member (e.g., "Welcome, @Alice!").
4. The mention uses the member's current display name, not their user ID or a hardcoded string.
5. The bot ignores its own join event and system messages.
6. The bot handles errors gracefully — missing permissions, deleted channels, rate limits.
7. Put the generated code in C:\Root\Code\Test\greeter-bot.

CRITICAL: only use C:\Root\Code\RootSdk.DevKit for context. 

---

## Evaluation

### Acceptance Criteria

- A new user joins the community.
- Within 5 seconds, a message appears in the welcome channel.
- The message contains a mention of the joining member using their current display name.
- No message is posted when the bot itself joins.
- If the welcome channel does not exist or the bot lacks permission, the error is logged (not thrown).

### Test Environment

- One channel group with one text channel ("welcome").
- One test user who joins after the bot is installed.
- The bot has permission to read members and post messages.
